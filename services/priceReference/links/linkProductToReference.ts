import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import {
    mapProductReferenceLinkToDTO,
    REFERENCE_ITEM_PROJECTION,
    type ProductReferenceLinkDoc,
    type ReferenceCatalogItemDoc,
} from "@/lib/mappers/priceReferenceMapper";
import { ProductModel } from "@/models/Product";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { ProductReferenceLinkDTO } from "@/types/shared/priceReference";
import { syncLinkedFlags } from "./syncLinkedFlags";

export const linkReferenceSchema = z.object({
    itemId: z.string().refine(isValidObjectId, { message: "Ítem inválido" }),
    matchMethod: z.enum(["part_number", "ean", "name", "manual"]).default("manual"),
});

/**
 * Vincula un producto con un ítem de una tienda de referencia. Si ya estaba vinculado con esa
 * tienda, el vínculo se reemplaza (uno por producto y tienda).
 */
export async function linkProductToReference(
    productId: string,
    input: unknown,
): Promise<ProductReferenceLinkDTO> {
    const parsed = linkReferenceSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Datos del vínculo inválidos");
    }
    if (!isValidObjectId(productId)) throw new Error("Producto no encontrado");
    await connectDB();

    const [product, item] = await Promise.all([
        ProductModel.findById(productId, { type: 1 }).lean<{ type?: string }>(),
        ReferenceCatalogItemModel.findById(parsed.data.itemId, REFERENCE_ITEM_PROJECTION).lean<ReferenceCatalogItemDoc>(),
    ]);
    if (!product) throw new Error("Producto no encontrado");
    if (product.type === "bundle") {
        throw new Error("Un combo no se vincula con referencias de precio: vinculá sus componentes");
    }
    if (!item) throw new Error("Ítem de referencia no encontrado");

    const previous = await ProductReferenceLinkModel.findOne(
        { productId, source: item.source },
        { itemId: 1 },
    ).lean<{ itemId: unknown }>();

    const link = await ProductReferenceLinkModel.findOneAndUpdate(
        { productId, source: item.source },
        { $set: { itemId: item._id, matchMethod: parsed.data.matchMethod, dismissed: false } },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<ProductReferenceLinkDoc>();

    await syncLinkedFlags(previous ? [item._id, previous.itemId] : [item._id]);
    return mapProductReferenceLinkToDTO(link!, item);
}
