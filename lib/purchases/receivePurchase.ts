import mongoose from "mongoose";
import { PurchaseModel } from "@/models/Purchase";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";

export async function receivePurchase(
    purchaseId: string,
    data: {
        items: {
            productId: string;
            quantity: number;
            serials?: string[];
        }[];
    },
) {
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
        const purchaseMap = new Map(
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
            if (product.hasSerialNumber) {
                if (!item.serials || item.serials.length !== item.quantity) {
                    throw new Error("Seriales inválidos");
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
                                cost: item.cost ?? product.cost ?? 0,
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
                            cost: item.cost ?? product.cost ?? 0,
                        },
                    ],
                    { session },
                );

                createdInventoryItems.push(inv[0]);
            }

            // 📦 actualizar stock
            await ProductModel.findByIdAndUpdate(
                item.productId,
                { $inc: { availableStock: item.quantity } },
                { session },
            );
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
