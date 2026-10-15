import { connectDB } from "@/lib/mongodb";
import { PurchaseModel } from "@/models/Purchase";
import { ProductModel } from "@/models/Product";
import { updatePurchaseSchema } from "@/lib/validators/purchaseSchema";
import { getSupplierById } from "@/lib/suppliers/getSupplierById";
import { calculatePurchaseTotals } from "./calculatePurchaseTotals";
import { getNextGenericNumber } from "../counters/getNextGenericNumber";

export async function updatePurchase(id: string, data: unknown) {
    await connectDB();

    const validatedData = updatePurchaseSchema.parse(data);

    const purchase = await PurchaseModel.findById(id);

    if (!purchase) {
        throw new Error("Compra no encontrada");
    }

    // Regla de negocio: no se puede editar una compra ya recibida, parcialmente recibida o cancelada
    if (["received", "partially_received", "cancelled"].includes(purchase.status)) {
        throw new Error(`No se puede editar una compra en estado "${purchase.status}"`);
    }

    // Actualizar proveedor si cambió
    if (validatedData.supplierId && validatedData.supplierId !== purchase.supplierId.toString()) {
        const supplier = await getSupplierById(validatedData.supplierId);
        if (!supplier) {
            throw new Error("Proveedor no encontrado");
        }
        purchase.supplierId = validatedData.supplierId;
        purchase.supplierName = supplier.name;
    }

    // Actualizar items si se enviaron
    if (validatedData.items) {
        const productIds = validatedData.items.map((i) => i.productId);
        const products = await ProductModel.find({
            _id: { $in: productIds },
        });

        if (products.length !== productIds.length) {
            throw new Error("Uno o más productos no existen");
        }

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));
        const validationErrors: string[] = [];

        for (const item of validatedData.items) {
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

        const preparedItems = validatedData.items.map((item) => {
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

        purchase.items = preparedItems;
        purchase.subtotal = subtotal;
        purchase.tax = tax;
        purchase.total = total;
    }

    // Actualizar documento si se envió
    if (validatedData.document) {
        const currentDoc = purchase.document
            ? typeof purchase.document.toObject === "function"
                ? purchase.document.toObject()
                : purchase.document
            : {};
        const mergedDoc = {
            ...currentDoc,
            ...validatedData.document,
        };
        if (mergedDoc.type === "generic" && !mergedDoc.number) {
            mergedDoc.number = await getNextGenericNumber();
        }
        purchase.document = mergedDoc;
    }

    if (validatedData.notes !== undefined) {
        purchase.notes = validatedData.notes;
    }

    if (validatedData.status !== undefined) {
        purchase.status = validatedData.status;
    }

    if (validatedData.currency !== undefined) {
        purchase.currency = validatedData.currency;
    }

    if (validatedData.exchangeRate !== undefined) {
        purchase.exchangeRate = validatedData.exchangeRate;
    }

    await purchase.save();

    return purchase;
}
