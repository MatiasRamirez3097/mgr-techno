import mongoose from "mongoose";
import { PurchaseModel } from "@/models/Purchase";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { connectDB } from "@/lib/mongodb";
import { receivePurchaseBodySchema } from "@/lib/validators/purchaseSchema";
import { recalculateBundlesForProducts } from "../products/recalculateBundlesStock";

export async function receivePurchase(purchaseId: string, data: unknown) {
    await connectDB();

    const validatedData = receivePurchaseBodySchema.parse(data);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchase =
            await PurchaseModel.findById(purchaseId).session(session);

        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        if (purchase.status === "received") {
            throw new Error("La compra ya fue recepcionada en su totalidad");
        }

        if (purchase.status === "cancelled") {
            throw new Error("No se puede recepcionar una compra cancelada");
        }

        if (purchase.status === "draft") {
            throw new Error("La compra debe estar confirmada antes de recepcionarse");
        }

        if (purchase.status !== "confirmed" && purchase.status !== "partially_received") {
            throw new Error(`Estado de compra inválido para recepcionar: ${purchase.status}`);
        }

        // Mapear items de la compra por productId
        type PurchaseItemDoc = (typeof purchase.items)[number];
        const purchaseItemMap = new Map<string, PurchaseItemDoc>();
        for (const pi of purchase.items) {
            purchaseItemMap.set(pi.productId.toString(), pi);
        }

        // Validar que los seriales no vengan duplicados en el payload
        const incomingSerials = validatedData.items
            .filter((i) => i.quantity > 0 && i.serials)
            .flatMap((i) => (i.serials || []).map((s) => s.trim()))
            .filter(Boolean);

        const uniqueSerials = new Set(incomingSerials);
        if (uniqueSerials.size !== incomingSerials.length) {
            throw new Error("Se detectaron números de serie duplicados en los datos ingresados");
        }

        if (incomingSerials.length > 0) {
            const existingInDb = await InventoryItemModel.findOne({
                serialNumber: { $in: incomingSerials },
            }).session(session);

            if (existingInDb) {
                throw new Error(
                    `El número de serie "${existingInDb.serialNumber}" ya existe en el inventario`,
                );
            }
        }

        // Traer productos de la base de datos
        const productIds = validatedData.items.map((i) => i.productId);
        const products = await ProductModel.find({
            _id: { $in: productIds },
        }).session(session);

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        const itemsToInsert: Record<string, unknown>[] = [];
        let totalQuantityToReceive = 0;

        for (const item of validatedData.items) {
            if (item.quantity <= 0) continue; // Sin recepción para este item en esta tanda

            const purchaseItem = purchaseItemMap.get(item.productId);
            if (!purchaseItem) {
                throw new Error("Uno o más productos no pertenecen a la compra");
            }

            const currentReceived = purchaseItem.receivedQuantity || 0;
            const pendingQty = purchaseItem.quantity - currentReceived;

            if (item.quantity > pendingQty) {
                throw new Error(
                    `Cantidad a recibir (${item.quantity}) para "${purchaseItem.name}" supera el saldo pendiente (${pendingQty})`,
                );
            }

            const product = productMap.get(item.productId);
            if (!product) {
                throw new Error(`Producto "${purchaseItem.name}" no encontrado en catálogo`);
            }

            totalQuantityToReceive += item.quantity;

            // Outlet
            if (product.isOutlet) {
                if (product.hasSerialNumber) {
                    const cleanSerials = (item.serials || []).map((s) => s.trim()).filter(Boolean);
                    if (cleanSerials.length !== item.quantity) {
                        throw new Error(
                            `Faltan números de serie para las ${item.quantity} unidades de Outlet de "${product.name}".`,
                        );
                    }
                }

                for (let i = 0; i < item.quantity; i++) {
                    const defect =
                        item.defects && item.defects[i] && item.defects[i].trim()
                            ? item.defects[i].trim()
                            : "Sin detalle de falla especificado";

                    const serial =
                        item.serials && item.serials[i] && item.serials[i].trim()
                            ? item.serials[i].trim()
                            : undefined;

                    itemsToInsert.push({
                        productId: item.productId,
                        purchaseId,
                        serialNumber: serial,
                        status: "available",
                        quantity: 1,
                        remainingQuantity: 1,
                        defectDescription: defect,
                        unitCost: purchaseItem.unitCost,
                    });
                }
            } else if (product.hasSerialNumber) {
                // Producto normal con número de serie
                const cleanSerials = (item.serials || []).map((s) => s.trim()).filter(Boolean);
                if (cleanSerials.length !== item.quantity) {
                    throw new Error(
                        `Se esperaban ${item.quantity} números de serie para "${product.name}", pero se recibieron ${cleanSerials.length}`,
                    );
                }

                for (const serial of cleanSerials) {
                    itemsToInsert.push({
                        productId: item.productId,
                        serialNumber: serial,
                        purchaseId,
                        status: "available",
                        quantity: 1,
                        remainingQuantity: 1,
                        unitCost: purchaseItem.unitCost,
                    });
                }
            } else {
                // Producto por lote (sin serial)
                itemsToInsert.push({
                    productId: item.productId,
                    purchaseId,
                    status: "available",
                    quantity: item.quantity,
                    remainingQuantity: item.quantity,
                    unitCost: purchaseItem.unitCost,
                });
            }

            // Actualizar stock del producto
            const previousAvailableStock = product.availableStock ?? 0;
            product.availableStock = (product.availableStock ?? 0) + item.quantity;
            product.totalStock = (product.totalStock ?? 0) + item.quantity;
            product.isAvailable = product.availableStock > 0;

            const stockRecovered =
                previousAvailableStock === 0 && product.availableStock > 0;

            if (stockRecovered && product.status === "publish") {
                product.status = "pending_review";
            }

            await product.save({ session });

            // Registrar cantidad recibida acumulada en el item de compra
            purchaseItem.receivedQuantity = currentReceived + item.quantity;
        }

        if (totalQuantityToReceive === 0) {
            throw new Error("Debe ingresar al menos una unidad para recepcionar");
        }

        // Recalcular stock y estado (pending_review si recuperan stock) de todos los combos compuestos por estos productos
        await recalculateBundlesForProducts(productIds, session);

        const createdInventoryItems = await InventoryItemModel.insertMany(
            itemsToInsert,
            { session },
        );

        // Determinar si la compra quedó completa o parcialmente recibida
        const allReceived = purchase.items.every(
            (pi: PurchaseItemDoc) => (pi.receivedQuantity || 0) >= pi.quantity,
        );

        purchase.status = allReceived ? "received" : "partially_received";
        purchase.receivedAt = new Date();
        purchase.markModified("items");
        await purchase.save({ session });

        await session.commitTransaction();
        return createdInventoryItems;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
