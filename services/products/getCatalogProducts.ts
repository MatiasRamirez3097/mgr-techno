import { connectDB } from "@/lib/mongodb";
import { ProductModel, CategoryModel } from "@/models";
import { normalizeSearch } from "@/lib/search/normalize";
import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { Types } from "mongoose";
import type { ProductFilters } from "@/types/shared/product";

// NOTA: Asegurate de agregar `brand?: string` a tu interfaz ProductFilters en tu archivo de tipos
export async function getCatalogProducts(
    filters: ProductFilters & { brand?: string } = {},
    page: number = 1,
    limit: number = 12,
) {
    await connectDB();
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
    // 2. ETAPA DE FILTRADO BASE (Sin incluir marca)
    // ==========================================
    const baseMatchStage: any = {};

    if (filters.status) {
        baseMatchStage.status = filters.status;
    } else if (!filters.adminView) {
        baseMatchStage.status = "publish";
    }

    if (filters.onSale) {
        baseMatchStage.salePrice = { $exists: true, $ne: null, $gt: 0 };
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
        pipeline.push({ $match: baseMatchStage });
    }

    // ==========================================
    // 3. ETAPA DE ORDENAMIENTO ($sort)
    // ==========================================
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
                sortStage.regularPrice = 1;
                break;
            case "price_desc":
                sortStage.regularPrice = -1;
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
    // 4. PREPARACIÓN DEL FILTRO DE MARCA
    // ==========================================
    const brandMatchStage: any = {};
    if (filters.brand) {
        // Soporta múltiples marcas ("id1,id2,id3")
        const brandIds = filters.brand
            .split(",")
            .filter(Boolean)
            .map((id: string) => new Types.ObjectId(id));

        if (brandIds.length > 0) {
            brandMatchStage.brand = { $in: brandIds };
        }
    }

    // ==========================================
    // 5. ETAPA DE PAGINACIÓN Y FACETAS DINÁMICAS ($facet)
    // ==========================================
    const metadataFacet: any[] = [];
    const dataFacet: any[] = [];

    // IMPORTANTE: El filtro de marca solo se aplica a los datos finales y al conteo,
    // pero NO se aplica a la extracción de marcas disponibles.
    if (Object.keys(brandMatchStage).length > 0) {
        metadataFacet.push({ $match: brandMatchStage });
        dataFacet.push({ $match: brandMatchStage });
    }

    metadataFacet.push({ $count: "total" });

    dataFacet.push({ $skip: skip });
    dataFacet.push({ $limit: limit });
    dataFacet.push({
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
    });

    pipeline.push({
        $facet: {
            metadata: metadataFacet,
            data: dataFacet,
            // Magia: Obtenemos todas las marcas de los productos de esta búsqueda
            brands: [
                { $group: { _id: "$brand" } }, // Agrupamos por ID de marca
                { $match: { _id: { $ne: null } } }, // Descartamos productos sin marca
                {
                    $lookup: {
                        from: "brands", // Colección de marcas
                        localField: "_id",
                        foreignField: "_id",
                        as: "brandInfo",
                    },
                },
                { $unwind: "$brandInfo" },
                { $project: { _id: 1, name: "$brandInfo.name" } },
                { $sort: { name: 1 } }, // Ordenamos alfabéticamente
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

        // Formateamos las marcas encontradas para el Drawer
        const availableBrands = result.brands.map((b: any) => ({
            _id: b._id.toString(),
            name: b.name,
        }));

        return {
            products: formattedProducts,
            availableBrands, // <- Devolvemos la nueva lista
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
            availableBrands: [],
            pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit },
        };
    }
}
