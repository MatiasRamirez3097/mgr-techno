import { connectDB } from "@/lib/mongodb";
import { ProductModel, CategoryModel } from "@/models";
import { normalizeSearch } from "@/lib/search/normalize";
import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { Types } from "mongoose";
import type { ProductFilters } from "@/types/shared/product";

export async function getCatalogProducts(
    filters: ProductFilters = {},
    page: number = 1,
    limit: number = 12,
) {
    await connectDB();
    console.log("filters category", filters.category);
    const pipeline: any[] = [];
    const skip = (page - 1) * limit;

    // ==========================================
    // 1. ETAPA DE BÚSQUEDA
    // ==========================================
    if (filters.search) {
        const normalizedSearch = normalizeSearch(filters.search).trim();
        if (normalizedSearch) {
            pipeline.push({
                $search: {
                    index: "search_products",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: normalizedSearch,
                                    path: "name",
                                    fuzzy: { maxEdits: 1, prefixLength: 1 },
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

    // ==========================================
    // 2. ETAPA DE FILTRADO
    // ==========================================
    const matchStage: any = {};

    if (filters.status) {
        matchStage.status = filters.status;
    } else if (!filters.adminView) {
        matchStage.status = "publish";
    }

    if (filters.onSale) {
        matchStage.salePrice = { $exists: true, $ne: null, $gt: 0 };
    }

    if (filters.category) {
        const category = await CategoryModel.findOne({
            slug: filters.category,
        }).lean();
        console.log(category);
        if (category) {
            const childIds = await getCategoriesDescendants(
                category._id.toString(),
                true,
            );
            matchStage.categories = {
                $in: [category._id, ...childIds],
            };
        } else {
            matchStage._id = null;
        }
    }
    console.log(matchStage.categories);

    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }

    // ==========================================
    // 3. ETAPA DE ORDENAMIENTO ($sort) OPTIMIZADA
    // ==========================================

    let sortStage: any = {};

    if (
        filters.search &&
        (!filters.orderby || filters.orderby === "relevance")
    ) {
        // En Atlas Search es "searchScore", no "textScore"
        sortStage = { score: { $meta: "searchScore" } };
    } else {
        // Usamos tu campo indexado isAvailable directamente para máxima velocidad
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

    pipeline.push({ $sort: sortStage });

    // ==========================================
    // 4. ETAPA DE PAGINACIÓN ($facet)
    // ==========================================
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [
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
                    },
                },
            ],
        },
    });

    try {
        const [result] = await ProductModel.aggregate(pipeline);

        const totalItems = result.metadata[0]?.total || 0;
        const totalPages = Math.ceil(totalItems / limit);

        const formattedProducts = result.data.map((product: any) =>
            mapProductToDTO(product),
        );
        console.log(formattedProducts);
        return {
            products: formattedProducts,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit,
            },
        };
    } catch (error) {
        console.error("Error en getCatalogProducts (Pipeline):", error);
        return {
            products: [],
            pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit },
        };
    }
}
