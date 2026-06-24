import { connectDB } from "@/lib/mongodb";
import { ProductModel, CategoryModel, BrandModel } from "@/models";
import { normalizeSearch } from "@/lib/search/normalize";
import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import type { ProductFilters } from "@/types/shared/product";
import { unstable_cache } from "next/cache";

export async function getCatalogProducts(
    filters: ProductFilters & { brand?: string; inStockOnly?: boolean } = {},
    page: number = 1,
    limit: number = 12,
) {
    const cacheKey = [
        "catalog_products",
        JSON.stringify(filters),
        String(page),
        String(limit),
    ];

    // Envolvemos toda la lógica pesada de la BD en unstable_cache
    const getCachedData = unstable_cache(
        async () => {
            await connectDB();
            const skip = (page - 1) * limit;

            // ==========================================
            // 1. PIPELINE BASE (Común para todas las consultas)
            // ==========================================
            const basePipeline: any[] = [];

            // BÚSQUEDA
            if (filters.search) {
                const normalizedSearch = normalizeSearch(filters.search).trim();
                if (normalizedSearch) {
                    basePipeline.push({
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
                }
            }

            // FILTRADO BASE
            const baseMatchStage: any = {};

            if (filters.status) {
                baseMatchStage.status = filters.status;
            } else if (!filters.adminView) {
                baseMatchStage.status = "publish";
            }

            if (filters.onSale) {
                baseMatchStage.salePrice = { $exists: true, $ne: null, $gt: 0 };
            }

            // NUEVO: Ocultar productos sin stock si la opción está activa usando isAvailable
            if (filters.inStockOnly) {
                baseMatchStage.isAvailable = true;
            }

            if (filters.category) {
                const category = await CategoryModel.findOne({
                    slug: filters.category,
                }).lean();

                if (category) {
                    const childIds = await getCategoriesDescendants(
                        category._id.toString(),
                        true,
                    );
                    baseMatchStage.categories = {
                        $in: [category._id, ...childIds],
                    };
                } else {
                    baseMatchStage._id = null;
                }
            }

            if (Object.keys(baseMatchStage).length > 0) {
                basePipeline.push({ $match: baseMatchStage });
            }

            // ORDENAMIENTO
            let sortStage: any = {};

            if (
                filters.search &&
                (!filters.orderby || filters.orderby === "relevance")
            ) {
                sortStage = { score: { $meta: "searchScore" } };
            } else {
                sortStage = { isAvailable: -1 };

                switch (filters.orderby) {
                    case "price_asc":
                        sortStage.effectivePrice = 1;
                        break;
                    case "price_desc":
                        sortStage.effectivePrice = -1;
                        break;
                    case "date_desc":
                    case "newest":
                        sortStage.createdAt = -1;
                        break;
                    case "name_asc":
                        sortStage.name = 1;
                        break;
                    case "name_desc":
                        sortStage.name = -1;
                        break;
                    default:
                        sortStage.createdAt = -1;
                        break;
                }
            }

            basePipeline.push({ $sort: sortStage });

            // ==========================================
            // 2. PIPELINE DE MARCA (Separado del base)
            // ==========================================
            const brandMatchPipeline: any[] = [];
            if (filters.brand) {
                const brandSlugs = filters.brand.split(",").filter(Boolean);

                if (brandSlugs.length > 0) {
                    const brands = await BrandModel.find(
                        { slug: { $in: brandSlugs } },
                        "_id",
                    ).lean();
                    const brandIds = brands.map((b: any) => b._id);

                    if (brandIds.length > 0) {
                        brandMatchPipeline.push({
                            $match: { brand: { $in: brandIds } },
                        });
                    } else {
                        brandMatchPipeline.push({ $match: { _id: null } });
                    }
                }
            }

            // ==========================================
            // 3. EJECUCIÓN PARALELA
            // ==========================================
            try {
                const [dataResult, countResult, brandsResult] =
                    await Promise.all([
                        // Consulta A: Productos Paginados
                        ProductModel.aggregate([
                            ...basePipeline,
                            ...brandMatchPipeline,
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    slug: 1,
                                    regularPrice: 1,
                                    salePrice: 1,
                                    image: 1,
                                    availableStock: 1,
                                    status: 1,
                                    categories: 1,
                                    taxRate: 1,
                                    effectivePrice: 1,
                                    images: 1,
                                    sku: 1,
                                    gtin: 1,
                                    brand: 1,
                                    description: 1,
                                    shortDescription: 1,
                                    weight: 1,
                                },
                            },
                        ]),

                        // Consulta B: Conteo Total
                        ProductModel.aggregate([
                            ...basePipeline,
                            ...brandMatchPipeline,
                            { $count: "total" },
                        ]),

                        // Consulta C: Marcas Disponibles
                        ProductModel.aggregate([
                            ...basePipeline,
                            { $group: { _id: "$brand" } },
                            { $match: { _id: { $ne: null } } },
                            {
                                $lookup: {
                                    from: "brands",
                                    localField: "_id",
                                    foreignField: "_id",
                                    as: "brandInfo",
                                },
                            },
                            { $unwind: "$brandInfo" },
                            {
                                $project: {
                                    _id: 1,
                                    name: "$brandInfo.name",
                                    slug: "$brandInfo.slug",
                                },
                            },
                            { $sort: { name: 1 } },
                        ]),
                    ]);

                const totalItems = countResult[0]?.total || 0;
                const totalPages = Math.ceil(totalItems / limit);

                const formattedProducts = dataResult.map((product: any) =>
                    mapProductToDTO(product),
                );

                const availableBrands = brandsResult.map((b: any) => ({
                    _id: b._id.toString(),
                    name: b.name,
                    slug: b.slug,
                }));

                return {
                    products: formattedProducts,
                    availableBrands,
                    pagination: {
                        totalItems,
                        totalPages,
                        currentPage: page,
                        limit,
                    },
                };
            } catch (error) {
                console.error("Error en getCatalogProducts (Parallel):", error);
                return {
                    products: [],
                    availableBrands: [],
                    pagination: {
                        totalItems: 0,
                        totalPages: 0,
                        currentPage: 1,
                        limit,
                    },
                };
            }
        },
        cacheKey,
        {
            revalidate: 60, // Refrescará la caché en segundo plano después de 60 segundos (para no mostrar stock viejo)
            tags: ["catalog-products"], // Útil por si más adelante quieres forzar la limpieza manual con revalidateTag()
        },
    );

    // Retornamos el resultado (ya sea que venga de la caché ultrarrápida o calculado fresco)
    return await getCachedData();
}
