import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { createDistributorLinkSchema } from "@/lib/validators/distributorLinkSchema";
import {
    mapProductDistributorLinkToDTO,
    type ProductDistributorLinkDoc,
} from "@/lib/mappers/productDistributorLinkMapper";
import type { ProductDistributorLinkDTO } from "@/types/shared/distributorLink";

/**
 * Vincula un producto con un ítem de un distribuidor. Si el producto ya estaba vinculado
 * con ese distribuidor, el vínculo se reemplaza (uno por producto y distribuidor).
 */
export async function linkProductToDistributor(
    productId: string,
    input: unknown,
): Promise<ProductDistributorLinkDTO> {
    const parsed = createDistributorLinkSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Datos del vínculo inválidos");
    }
    if (!isValidObjectId(productId)) {
        throw new Error("Producto no encontrado");
    }

    await connectDB();

    const product = await ProductModel.findById(productId, { type: 1 }).lean<{ type?: string }>();
    if (!product) {
        throw new Error("Producto no encontrado");
    }
    if (product.type === "bundle") {
        throw new Error("Un combo no se vincula con distribuidores: vinculá sus componentes");
    }

    const data = parsed.data;
    const doc = await ProductDistributorLinkModel.findOneAndUpdate(
        { productId, distributor: data.distributor },
        {
            $set: {
                distributorProductId: data.distributorProductId,
                distributorSku: data.distributorSku,
                name: data.name,
                link: data.link,
                image: data.image,
                matchMethod: data.matchMethod,
                lastPrice: data.price,
                lastStock: data.stock,
                lastStockLabel: data.stockLabel,
                lastCheckedAt: data.price !== null ? new Date() : null,
                // Un vínculo nuevo o reemplazado arranca sin historial
                previousPrice: null,
                priceChangedAt: null,
                missingSince: null,
            },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<ProductDistributorLinkDoc>();

    return mapProductDistributorLinkToDTO(doc!);
}
