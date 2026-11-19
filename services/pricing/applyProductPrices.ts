import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { applyPricesSchema } from "@/lib/validators/pricingSchema";
import { buildPriceUpdate } from "@/lib/priceReview";
import { updateProductQuickFields } from "@/services/products/updateProductById";
import { getActiveDailyDeal } from "@/services/dailyDeals/getActiveDailyDeal";

export interface ApplyPricesResult {
    updated: number;
    errors: { productId: string; error: string }[];
}

/**
 * Aplica precios finales desde la revisión de precios. Respeta las ofertas vigentes
 * (buildPriceUpdate) y delega en updateProductQuickFields, que recalcula effectivePrice,
 * los combos que contienen el producto y la caché del catálogo.
 */
export async function applyProductPrices(data: unknown): Promise<ApplyPricesResult> {
    const parsed = applyPricesSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Precios inválidos");
    }

    await connectDB();
    const updates = parsed.data.updates.filter((u) => isValidObjectId(u.productId));
    const products = await ProductModel.find(
        { _id: { $in: updates.map((u) => u.productId) } },
        { regularPrice: 1, salePrice: 1, type: 1 },
    ).lean<{ _id: { toString(): string }; regularPrice: number; salePrice?: number | null; type?: string }[]>();
    const byId = new Map(products.map((p) => [p._id.toString(), p]));
    // La oferta del día no es una oferta propia: un precio nuevo cambia el regular y la reemplaza
    // (al terminar el día no se restaura porque el salePrice ya no es el de la oferta)
    const dailyDealIds = new Set((await getActiveDailyDeal())?.productIds ?? []);

    const result: ApplyPricesResult = { updated: 0, errors: [] };
    for (const { productId, price } of updates) {
        const product = byId.get(productId);
        if (!product) {
            result.errors.push({ productId, error: "Producto no encontrado" });
            continue;
        }
        if (product.type === "bundle") {
            result.errors.push({ productId, error: "El precio de un combo depende de sus componentes" });
            continue;
        }
        try {
            const rounded = Math.round(price * 100) / 100;
            const current = dailyDealIds.has(productId) ? { ...product, salePrice: null } : product;
            await updateProductQuickFields(productId, buildPriceUpdate(current, rounded));
            result.updated++;
        } catch (err) {
            result.errors.push({
                productId,
                error: err instanceof Error ? err.message : "Error al actualizar el precio",
            });
        }
    }
    return result;
}
