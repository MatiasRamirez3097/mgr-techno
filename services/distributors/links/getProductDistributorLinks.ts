import { connectDB } from "@/lib/mongodb";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import {
    mapProductDistributorLinkToDTO,
    type ProductDistributorLinkDoc,
} from "@/lib/mappers/productDistributorLinkMapper";
import type { ProductDistributorLinkDTO } from "@/types/shared/distributorLink";
import { applyLocalCatalogPrices } from "./applyLocalCatalogPrices";

/** Vínculos de un producto con el costo vigente (Invid y AIR) o el último visto (Elit, NewBytes). */
export async function getProductDistributorLinks(productId: string): Promise<ProductDistributorLinkDTO[]> {
    await connectDB();
    const docs = await ProductDistributorLinkModel.find({ productId })
        .sort({ distributor: 1 })
        .lean<ProductDistributorLinkDoc[]>();
    return applyLocalCatalogPrices(docs.map(mapProductDistributorLinkToDTO));
}
