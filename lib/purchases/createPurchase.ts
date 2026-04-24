import mongoose from "mongoose";
import { findProductsById } from "../products/getProductsById";

interface PurchaseItemInput {
    productId: string;
    quantity: number;
    unitCost: number;
    serialNumbers?: string[]; // Opcional
    location?: string;
}

interface CreatePurchaseInput {
    supplierId: string;
    items: PurchaseItemInput[];
    notes?: string;
}

export async function createPurchase(data: CreatePurchaseInput) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        session.startTransaction();
        // 1. Validar productos
        const productIds = data.items.map((item) => item.productId);
        const products = await findProductsById(productIds, session);

        if (products.length !== productIds.length) {
            throw new Error("Uno o más productos no existen");
        }

        // 2. Validar seriales según producto
        for (const item of data.items) {
            const product = products.find(
                (p) => p.id.toString() === item.productId,
            );

            if (product?.hasSerialNumber) {
                // Si requiere serial, debe venir con la cantidad exacta
                if (
                    !item.serialNumbers ||
                    item.serialNumbers.length !== item.quantity
                ) {
                    throw new Error(
                        `Producto ${product.name} requiere ${item.quantity} números de serie`,
                    );
                }

                // Verificar que no existan seriales duplicados
                const existingSerials = await InventoryItemModel.find({
                    serialNumber: { $in: item.serialNumbers },
                }).session(session);

                if (existingSerials.length > 0) {
                    throw new Error(
                        `Números de serie duplicados: ${existingSerials
                            .map((i) => i.serialNumber)
                            .join(", ")}`,
                    );
                }
            } else if (item.serialNumbers && item.serialNumbers.length > 0) {
                throw new Error(
                    `Producto ${product?.name} no usa números de serie`,
                );
            }
        }

        // 3. Crear Purchase
        const purchaseNumber = await generatePurchaseNumber();
        const totalCost = data.items.reduce(
            (sum, item) => sum + item.quantity * item.unitCost,
            0,
        );

        const purchase = await PurchaseModel.create(
            [
                {
                    supplierId: data.supplierId,
                    purchaseNumber,
                    items: data.items,
                    totalCost,
                    status: "ordered",
                    notes: data.notes,
                },
            ],
            { session },
        );

        // 4. NO crear InventoryItems aún (solo cuando se reciba)
        // Esta es la parte clave: los items se crean al RECIBIR, no al ORDENAR

        await session.commitTransaction();
        return purchase[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
