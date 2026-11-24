import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { PRODUCT_CODE_COLLATION } from "@/models/Product";
import {
    gtinCandidates,
    normalizeScanCode,
    type ProductCodeField,
} from "@/lib/scan/productCode";
import type { ProductCodeLookupDoc } from "@/types/backend/pendingSale";
import type { ScannedProductDTO } from "@/types/shared/pendingSale";

const MAX_RESULTS = 10;

/**
 * Busca productos cuyo GTIN, SKU o MPN coincida exactamente con el código escaneado
 * (sin distinguir mayúsculas; en GTIN, sin importar los ceros a la izquierda).
 */
export async function findProductsByCode(rawCode: string): Promise<ScannedProductDTO[]> {
    const code = normalizeScanCode(rawCode);
    if (!code) return [];

    await connectDB();

    const gtins = gtinCandidates(code);
    const products = await ProductModel.find({
        $or: [{ gtin: { $in: gtins } }, { sku: code }, { mpn: code }],
    })
        .collation(PRODUCT_CODE_COLLATION)
        .select("name image images sku mpn gtin availableStock effectivePrice type")
        .limit(MAX_RESULTS)
        .lean<ProductCodeLookupDoc[]>();

    const lower = code.toLowerCase();
    const gtinSet = new Set(gtins);

    return products.map((p) => {
        const matchedFields: ProductCodeField[] = [];
        if (p.gtin && gtinSet.has(String(p.gtin).trim())) matchedFields.push("gtin");
        if (p.sku && String(p.sku).trim().toLowerCase() === lower) matchedFields.push("sku");
        if (p.mpn && String(p.mpn).trim().toLowerCase() === lower) matchedFields.push("mpn");

        return {
            id: p._id.toString(),
            name: p.name,
            image: p.image || p.images?.[0] || null,
            sku: p.sku ?? "",
            mpn: p.mpn ?? "",
            gtin: p.gtin ?? "",
            availableStock: Number(p.availableStock) || 0,
            effectivePrice: Number(p.effectivePrice) || 0,
            type: p.type === "bundle" ? "bundle" : "simple",
            matchedFields,
        };
    });
}
