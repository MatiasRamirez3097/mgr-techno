import { ProductModel } from "@/models/Product";
import { PurchaseModel } from "@/models/Purchase";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
    createPurchaseSchema,
    updatePurchaseDocumentSchema,
} from "@/lib/validators/purchaseSchema";
import { getNextGenericNumber } from "@/lib/counters/getNextGenericNumber";
import { getSupplierById } from "../suppliers/getSupplierById";
import { calculatePurchaseTotals } from "./calculatePurchaseTotals";

export async function createPurchase(data: unknown) {
    await connectDB();

    // 1. Validar con Zod (lanza ZodError si es inválido)
    const validatedData = createPurchaseSchema.parse(data);
    const { document, items, notes, status, supplierId, currency, exchangeRate } = validatedData;

    const supplier = await getSupplierById(supplierId);
    if (!supplier) {
        throw new Error("Proveedor no encontrado");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Traer productos
        const productIds = items.map((i) => i.productId);

        const products = await ProductModel.find({
            _id: { $in: productIds },
        }).session(session);

        if (products.length !== productIds.length) {
            throw new Error("Uno o más productos no existen");
        }

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        // 2. Validaciones
        const validationErrors: string[] = [];

        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product) continue;

            if (!product.manageStock) {
                validationErrors.push(
                    `El producto "${product.name}" no gestiona stock`,
                );
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(
                `Errores de validación:\n${validationErrors.join("\n")}`,
            );
        }

        // 3. Preparar items y calcular totales
        const preparedItems = items.map((item) => {
            const product = productMap.get(item.productId)!;
            const taxRate =
                item.taxRate !== undefined && item.taxRate !== null
                    ? item.taxRate
                    : (product.taxRate ?? 10.5);

            return {
                productId: item.productId,
                name: item.name || product.name,
                quantity: item.quantity,
                receivedQuantity: 0,
                unitCost: item.unitCost,
                taxRate,
            };
        });

        const { subtotal, tax, total } = calculatePurchaseTotals(preparedItems);

        // 4. Asignar número genérico si aplica
        if (document.type === "generic" && !document.number) {
            document.number = await getNextGenericNumber();
        }

        // 5. Crear compra
        const purchase = await PurchaseModel.create(
            [
                {
                    supplierId,
                    supplierName: supplier.name,
                    items: preparedItems,
                    subtotal,
                    tax,
                    total,
                    status,
                    currency,
                    exchangeRate,
                    document,
                    notes,
                },
            ],
            { session },
        );

        await session.commitTransaction();
        return purchase[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Función auxiliar para actualizar solo el documento
export async function updatePurchaseDocument(data: unknown) {
    await connectDB();
    const validatedData = updatePurchaseDocumentSchema.parse(data);

    const purchase = await PurchaseModel.findById(validatedData.purchaseId);

    if (!purchase) {
        throw new Error("Compra no encontrada");
    }

    purchase.document = {
        ...purchase.document,
        ...validatedData.document,
    };

    await purchase.save();

    return purchase;
}
