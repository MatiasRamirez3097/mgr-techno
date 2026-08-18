import mongoose from "mongoose";
import { PurchaseModel } from "@/models/Purchase";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { connectDB } from "../mongodb";

export async function receivePurchase(
    purchaseId: string,
    data: {
        items: {
            productId: string;
            quantity: number;
            serials?: string[];
            defects?: string[];
        }[];
    },
) {
    await connectDB();
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const purchase =
            await PurchaseModel.findById(purchaseId).session(session);

        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        if (purchase.status === "received") {
            throw new Error("La compra ya fue recepcionada");
        }

        // 🔒 Mapear items de la compra original
        const purchaseMap = new Map<string, number>(
            purchase.items.map((i: any) => [
                i.productId.toString(),
                i.quantity,
            ]),
        );

        // 🔥 Traer TODOS los productos de una
        const productIds = data.items.map((i) => i.productId);

        const products = await ProductModel.find({
            _id: { $in: productIds },
        }).session(session);

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        const createdInventoryItems = [];
        console.log("data.items>>>", data.items);
        for (const item of data.items) {
            const product = productMap.get(item.productId);

            if (!product) throw new Error("Producto no encontrado");

            // 🔒 VALIDAR contra la compra
            const purchasedQty = purchaseMap.get(item.productId);

            if (!purchasedQty) {
                throw new Error("Producto no pertenece a la compra");
            }

            if (item.quantity > purchasedQty) {
                throw new Error("Cantidad recibida mayor a la comprada");
            }

            // 🔴 SERIALIZADO
            if (product.isOutlet) {
                if (product.hasSerialNumber) {
                    if (
                        !item.serials ||
                        item.serials.length !== item.quantity
                    ) {
                        throw new Error(
                            "Faltan números de serie para las unidades de Outlet.",
                        );
                    }

                    // Validar duplicados para que no ingresen seriales repetidos
                    const existingSerials = await InventoryItemModel.findOne({
                        productId: item.productId,
                        serialNumber: { $in: item.serials },
                    }).session(session);

                    if (existingSerials) {
                        throw new Error(
                            `Uno o más números de serie de Outlet ya existen en el inventario.`,
                        );
                    }
                }

                // 2. Iteramos creando un InventoryItem ÚNICO por CADA unidad física recibida
                for (let i = 0; i < item.quantity; i++) {
                    const defect =
                        item.defects && item.defects[i]
                            ? item.defects[i]
                            : "Sin detalle de falla especificado";

                    const serial =
                        item.serials && item.serials[i]
                            ? item.serials[i]
                            : undefined;

                    const inv = await InventoryItemModel.create(
                        [
                            {
                                productId: item.productId,
                                purchaseId,
                                serialNumber: serial, // ACÁ AHORA SÍ GUARDAMOS EL SERIAL
                                status: "available",
                                quantity: 1, // Siempre 1 unidad física por item en outlet
                                remainingQuantity: 1,
                                defectDescription: defect, // Guardamos la falla específica
                            },
                        ],
                        { session },
                    );
                    createdInventoryItems.push(inv[0]);
                }
            } else if (product.hasSerialNumber) {
                if (!item.serials || item.serials.length !== item.quantity) {
                    throw new Error("Seriales inválidos");
                }

                // NUEVO: Validar que los seriales no existan ya en la DB
                const existingSerials = await InventoryItemModel.findOne({
                    productId: item.productId,
                    serialNumber: { $in: item.serials },
                }).session(session);

                if (existingSerials) {
                    throw new Error(
                        `Uno o más números de serie ya existen en el inventario para este producto.`,
                    );
                }

                for (const serial of item.serials) {
                    const inv = await InventoryItemModel.create(
                        [
                            {
                                productId: item.productId,
                                serialNumber: serial,
                                purchaseId,
                                status: "available",
                                quantity: 1,
                                remainingQuantity: 1,
                            },
                        ],
                        { session },
                    );

                    createdInventoryItems.push(inv[0]);
                }
            } else {
                // 🟢 NO SERIAL → lote
                const inv = await InventoryItemModel.create(
                    [
                        {
                            productId: item.productId,
                            purchaseId,
                            status: "available",
                            quantity: item.quantity,
                            remainingQuantity: item.quantity,
                        },
                    ],
                    { session },
                );

                createdInventoryItems.push(inv[0]);
            }

            // 📦 guardar stock anterior
            const previousAvailableStock = product.availableStock ?? 0;

            // 📦 actualizar stock
            product.availableStock += item.quantity;
            product.totalStock += item.quantity;
            product.isAvailable = product.availableStock > 0;
            // 🔍 detectar reposición
            const stockRecovered =
                previousAvailableStock === 0 && product.availableStock > 0;

            if (stockRecovered && product.status === "publish") {
                product.status = "pending_review";
            }
            console.log("product:::", product);
            await product.save({ session });
        }

        // ✅ Marcar compra como recibida
        purchase.status = "received";
        purchase.receivedAt = new Date();
        await purchase.save({ session });

        await session.commitTransaction();
        session.endSession();

        return createdInventoryItems;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
