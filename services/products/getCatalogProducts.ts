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
    // 1. ETAPA DE BÚSQUEDA (Debe ser la primera si existe)
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
    // 2. ETAPA DE FILTRADO (El equivalente al .find() normal)
    // ==========================================
    const matchStage: any = {};

    // Filtro por Estado (Público vs Admin)
    if (filters.status) {
        matchStage.status = filters.status;
    } else if (!filters.adminView) {
        matchStage.status = "publish";
    }

    // Filtro por Ofertas
    if (filters.onSale) {
        matchStage.salePrice = { $exists: true, $ne: null, $gt: 0 };
    }

    // Filtro por Categorías
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
            // Si buscan una categoría que no existe, forzamos que no traiga nada
            matchStage._id = null;
        }
    }
    console.log(matchStage.categories);
    // Solo agregamos el $match si hay alguna condición (para no romper la tubería)
    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }

    // ==========================================
    // 3. ETAPA DE ORDENAMIENTO ($sort)
    // ==========================================
    // Mantenemos la lógica de poner siempre lo que tiene stock arriba
    let sortStage: any = { availableStock: -1 };

    if (filters.orderby) {
        switch (filters.orderby) {
            case "price_asc":
                sortStage.regularPrice = 1;
                break;
            case "price_desc":
                sortStage.regularPrice = -1;
                break;
            case "date_desc":
                sortStage.createdAt = -1;
                break;
            // Si la búsqueda viene de Atlas Search, Atlas ya calculó el "Score" de relevancia.
            // "relevance" ordena por ese score automáticamente.
            case "relevance":
                if (filters.search)
                    sortStage = { score: { $meta: "textScore" } };
                break;
        }
    }

    pipeline.push({ $sort: sortStage });

    // ==========================================
    // 4. ETAPA DE PAGINACIÓN MAGISTRAL ($facet)
    // ==========================================
    // El facet divide la tubería en dos caminos paralelos:
    // Camino 1: Recorta los productos para esta página (skip y limit)
    // Camino 2: Cuenta cuántos productos pasaron los filtros en total
    pipeline.push({
        $facet: {
            // El array de productos paginados
            metadata: [
                // Equivalente a countDocuments()
                { $count: "total" },
            ],
            data: [
                { $skip: skip },
                { $limit: limit },
                // Elegimos qué datos mandar al frontend para ahorrar memoria
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

        // ¡ACÁ USAMOS TU MAPPER!
        // Pasamos cada producto crudo por la función que limpia los Buffers y asigna valores por defecto
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
