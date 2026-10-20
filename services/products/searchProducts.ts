import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { normalizeSearch } from "@/lib/search/normalize";
import {
    buildAdminProductSearchMatch,
    buildAdminProductSearchScoreStage,
} from "@/lib/search/adminProductSearch";
import { mapProductToDTO } from "@/lib/mappers/productMapper";

export async function searchProducts(
    search: string,
    options?: {
        allStatus?: boolean;
        adminMode?: boolean;
        excludeBundles?: boolean;
    },
) {
    await connectDB();

    if (!search?.trim()) {
        return [];
    }

    // ==========================================
    // MODO ADMIN: Búsqueda precisa Multi-Palabra (AND) + Relevancia por SKU/Nombre
    // ==========================================
    if (options?.adminMode) {
        const searchMatch = buildAdminProductSearchMatch(search);
        if (!searchMatch) return [];

        const matchConditions: any[] = [searchMatch];

        if (!options?.allStatus) {
            matchConditions.push({ status: "publish" });
        }

        if (options?.excludeBundles) {
            matchConditions.push({ type: { $ne: "bundle" } });
        }

        const finalMatch =
            matchConditions.length === 1
                ? matchConditions[0]
                : { $and: matchConditions };

        const adminPipeline: any[] = [
            { $match: finalMatch },
            buildAdminProductSearchScoreStage(search),
            {
                $sort: {
                    _adminSearchScore: -1,
                    availableStock: -1,
                    name: 1,
                },
            },
            { $limit: 20 },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    type: 1,
                    status: 1,
                    bundleItemsCount: 1,
                    regularPrice: 1,
                    salePrice: 1,
                    effectivePrice: 1,
                    image: 1,
                    images: 1,
                    availableStock: 1,
                    sku: 1,
                    taxRate: 1,
                    gtin: 1,
                    mpn: 1,
                    isAvailable: 1,
                },
            },
        ];

        const adminProducts = await ProductModel.aggregate(adminPipeline);
        return adminProducts.map(mapProductToDTO);
    }

    // ==========================================
    // MODO TIENDA PÚBLICA: Atlas Search Autocomplete
    // ==========================================
    const normalizedSearch = normalizeSearch(search).trim();

    if (!normalizedSearch) {
        return [];
    }

    const pipeline: any[] = [];

    pipeline.push({
        $search: {
            index: "search_products",
            compound: {
                should: [
                    {
                        autocomplete: {
                            query: normalizedSearch,
                            path: "name",
                            fuzzy: {
                                maxEdits: 1,
                                prefixLength: 1,
                            },
                        },
                    },
                    {
                        autocomplete: {
                            query: normalizedSearch,
                            path: "sku",
                        },
                    },
                    {
                        autocomplete: {
                            query: normalizedSearch,
                            path: "mpn",
                        },
                    },
                    {
                        autocomplete: {
                            query: normalizedSearch,
                            path: "gtin",
                        },
                    },
                ],
                minimumShouldMatch: 1,
            },
        },
    });

    const matchStage: Record<string, any> = {
        isAvailable: true,
    };

    if (!options?.allStatus) {
        matchStage.status = "publish";
    }

    if (options?.excludeBundles) {
        matchStage.type = { $ne: "bundle" };
    }

    pipeline.push({ $match: matchStage });

    pipeline.push({
        $sort: {
            availableStock: -1,
        },
    });

    pipeline.push({
        $limit: 8,
    });

    pipeline.push({
        $project: {
            name: 1,
            slug: 1,
            type: 1,
            status: 1,
            bundleItemsCount: 1,
            regularPrice: 1,
            salePrice: 1,
            effectivePrice: 1,
            image: 1,
            images: 1,
            availableStock: 1,
            sku: 1,
            taxRate: 1,
            gtin: 1,
            mpn: 1,
            isAvailable: 1,
        },
    });

    const products = await ProductModel.aggregate(pipeline);

    return products.map(mapProductToDTO);
}
