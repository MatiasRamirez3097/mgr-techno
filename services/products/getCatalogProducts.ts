import { connectDB } from "@/lib/mongodb";
import { ProductModel, CategoryModel, BrandModel } from "@/models";
import { normalizeSearch } from "@/lib/search/normalize";
import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { getProductHealth } from "@/lib/products/getProductHealth";
import type {
    AvailableAttributeFacet,
    ProductFilters,
} from "@/types/shared/product";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { Types } from "mongoose";

export function revalidateProductsCache() {
    try {
        revalidateTag("catalog-products", "default");
        revalidatePath("/products");
        revalidatePath("/admin/products");
    } catch {
        // Ignorar si se ejecuta fuera del contexto de una petición Next.js
    }
}

const PRODUCT_PROJECT_STAGE = {
    $project: {
        _id: 1,
        type: 1,
        bundleItemsCount: 1,
        attributes: 1,
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
        dimensions: 1,
        featured: 1,
        isOutlet: 1,
        hasFreeShipping: 1,
        shippingSize: 1,
        isAvailable: 1,
    },
};

function expandAttributeCandidateValues(rawValues: string[]): any[] {
    const candidates: any[] = [];
    for (const raw of rawValues) {
        const trimmed = String(raw).trim();
        if (!trimmed) continue;
        candidates.push(trimmed);

        const num = Number(trimmed);
        if (!Number.isNaN(num)) {
            candidates.push(num);
        }

        const lower = trimmed.toLowerCase();
        if (lower === "true" || lower === "sí" || lower === "si") {
            candidates.push(true);
        } else if (lower === "false" || lower === "no") {
            candidates.push(false);
        }
    }
    return candidates;
}

function formatAttributeFacets(rawFacets: any[]): AvailableAttributeFacet[] {
    if (!Array.isArray(rawFacets)) return [];

    return rawFacets
        .filter((f) => f?._id && f?.label && Array.isArray(f?.options) && f.options.length > 0)
        .map((f) => {
            const unit = f.unit ? String(f.unit).trim() : "";
            const options = [...f.options]
                .map((opt: any) => {
                    const valStr = String(opt.value ?? "").trim();
                    let displayValue = valStr;
                    if (valStr === "true") {
                        displayValue = "Sí";
                    } else if (valStr === "false") {
                        displayValue = "No";
                    } else if (unit) {
                        displayValue = `${valStr} ${unit}`;
                    }
                    return {
                        value: valStr,
                        displayValue,
                        count: Number(opt.count) || 0,
                    };
                })
                .sort((a, b) =>
                    a.value.localeCompare(b.value, "es", {
                        numeric: true,
                        sensitivity: "base",
                    }),
                );

            return {
                key: String(f._id),
                label: String(f.label),
                unit: unit || undefined,
                options,
            };
        })
        .sort((a, b) =>
            a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
        );
}

async function fetchCatalogProducts(
    filters: ProductFilters & {
        brand?: string;
        inStockOnly?: boolean;
        isOutlet?: boolean;
    },
    page: number,
    limit: number,
) {
    await connectDB();
    const skip = (page - 1) * limit;

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

    if (filters.isOutlet) {
        baseMatchStage.isOutlet = true;
    }

    if (filters.inStockOnly) {
        baseMatchStage.isAvailable = true;
    }

    if (filters.stock === "in_stock") {
        baseMatchStage.availableStock = { $gt: 0 };
    } else if (filters.stock === "out_of_stock") {
        baseMatchStage.$or = [
            { availableStock: { $lte: 0 } },
            { availableStock: null },
            { availableStock: { $exists: false } },
        ];
    }

    // Filtro por categoría (soporta tanto slug como categoryId)
    if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
        const childIds = await getCategoriesDescendants(
            filters.categoryId,
            true,
        );
        baseMatchStage.categories = {
            $in: [new Types.ObjectId(filters.categoryId), ...childIds],
        };
    } else if (filters.category) {
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
        sortStage = {
            isAvailable: -1,
            score: { $meta: "searchScore" },
        };
    } else {
        sortStage = { isAvailable: -1 };
        switch (filters.orderby) {
            case "price_asc":
            case "price-asc":
                sortStage.effectivePrice = 1;
                break;
            case "price_desc":
            case "price-desc":
                sortStage.effectivePrice = -1;
                break;
            case "date_desc":
            case "newest":
                sortStage.createdAt = -1;
                break;
            case "oldest":
                sortStage.createdAt = 1;
                break;
            case "name_asc":
            case "name-asc":
                sortStage.name = 1;
                break;
            case "name_desc":
            case "name-desc":
                sortStage.name = -1;
                break;
            default:
                sortStage.createdAt = -1;
                break;
        }
    }

    const baseFilterPipeline = [...basePipeline];
    const sortedPipeline = [...baseFilterPipeline, { $sort: sortStage }];

    // PIPELINE DE MARCA
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

    // PIPELINE DE ATRIBUTOS DINÁMICOS (?attr_<key>=val1,val2)
    const attributeMatchPipeline: any[] = [];
    if (
        filters.attributeFilters &&
        Object.keys(filters.attributeFilters).length > 0
    ) {
        const attrAndConditions: any[] = [];
        for (const [attrKey, rawVals] of Object.entries(
            filters.attributeFilters,
        )) {
            if (!attrKey || !Array.isArray(rawVals) || rawVals.length === 0) {
                continue;
            }
            const candidates = expandAttributeCandidateValues(rawVals);
            if (candidates.length === 0) continue;

            attrAndConditions.push({
                attributes: {
                    $elemMatch: {
                        key: attrKey,
                        value: { $in: candidates },
                    },
                },
            });
        }

        if (attrAndConditions.length > 0) {
            attributeMatchPipeline.push({
                $match: { $and: attrAndConditions },
            });
        }
    }

    try {
        const hasQualityFilter =
            Boolean(filters.adminView) &&
            Boolean(filters.quality) &&
            filters.quality !== "all";

        if (hasQualityFilter) {
            const [rawProducts, allCategories] = await Promise.all([
                ProductModel.aggregate([
                    ...sortedPipeline,
                    ...brandMatchPipeline,
                    ...attributeMatchPipeline,
                    PRODUCT_PROJECT_STAGE,
                ]),
                getCategoriesBase({ limit: 0 }),
            ]);

            const mappedAll = rawProducts.map((p: any) => mapProductToDTO(p));
            const filteredByQuality = mappedAll.filter((product) => {
                const health = getProductHealth(product, allCategories);
                switch (filters.quality) {
                    case "optimal":
                        return (
                            health.score >= 90 && health.critical.length === 0
                        );
                    case "warnings":
                        return (
                            health.score >= 70 &&
                            health.score < 90 &&
                            health.critical.length === 0
                        );
                    case "critical":
                        return health.score < 70 || health.critical.length > 0;
                    case "missing_attributes":
                        return health.missingAttributes.length > 0;
                    default:
                        return true;
                }
            });

            const totalItems = filteredByQuality.length;
            const paginatedProducts = filteredByQuality.slice(
                skip,
                skip + limit,
            );

            return {
                products: paginatedProducts,
                availableBrands: [],
                availableAttributes: [] as AvailableAttributeFacet[],
                pagination: {
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    limit,
                },
            };
        }

        const [dataResult, countResult, brandsResult, attributesResult] =
            await Promise.all([
                ProductModel.aggregate([
                    ...sortedPipeline,
                    ...brandMatchPipeline,
                    ...attributeMatchPipeline,
                    { $skip: skip },
                    { $limit: limit },
                    PRODUCT_PROJECT_STAGE,
                ]),
                ProductModel.aggregate([
                    ...baseFilterPipeline,
                    ...brandMatchPipeline,
                    ...attributeMatchPipeline,
                    { $count: "total" },
                ]),
                ProductModel.aggregate([
                    ...baseFilterPipeline,
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
                // FACETAS DE ATRIBUTOS EN TODO EL CATÁLOGO CONSULTADO (TODAS LAS PÁGINAS)
                ProductModel.aggregate([
                    ...baseFilterPipeline,
                    { $match: { "attributes.0": { $exists: true } } },
                    { $unwind: "$attributes" },
                    {
                        $addFields: {
                            _attrValuesArray: {
                                $cond: [
                                    { $isArray: "$attributes.value" },
                                    "$attributes.value",
                                    ["$attributes.value"],
                                ],
                            },
                        },
                    },
                    { $unwind: "$_attrValuesArray" },
                    {
                        $match: {
                            _attrValuesArray: { $nin: [null, ""] },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                key: "$attributes.key",
                                val: { $toString: "$_attrValuesArray" },
                            },
                            label: { $first: "$attributes.label" },
                            unit: { $first: "$attributes.unit" },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $group: {
                            _id: "$_id.key",
                            label: { $first: "$label" },
                            unit: { $first: "$unit" },
                            options: {
                                $push: {
                                    value: "$_id.val",
                                    count: "$count",
                                },
                            },
                        },
                    },
                ]),
            ]);

        const totalItems = countResult[0]?.total || 0;
        const formattedProducts = dataResult.map((product: any) =>
            mapProductToDTO(product),
        );
        const availableBrands = brandsResult.map((b: any) => ({
            _id: b._id.toString(),
            name: b.name,
            slug: b.slug,
        }));
        const availableAttributes = formatAttributeFacets(attributesResult);

        return {
            products: formattedProducts,
            availableBrands,
            availableAttributes,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit,
            },
        };
    } catch (error) {
        console.error("Error en getCatalogProducts:", error);
        return {
            products: [],
            availableBrands: [],
            availableAttributes: [] as AvailableAttributeFacet[],
            pagination: {
                totalItems: 0,
                totalPages: 0,
                currentPage: 1,
                limit,
            },
        };
    }
}

export async function getCatalogProducts(
    filters: ProductFilters & {
        brand?: string;
        inStockOnly?: boolean;
        isOutlet?: boolean;
    } = {},
    page: number = 1,
    limit: number = 12,
) {
    // Si la llamada viene del panel de administración, consultar directo sin caché
    if (filters.adminView) {
        return fetchCatalogProducts(filters, page, limit);
    }

    const cacheKey = [
        "catalog_products",
        JSON.stringify(filters),
        String(page),
        String(limit),
    ];

    const getCachedData = unstable_cache(
        () => fetchCatalogProducts(filters, page, limit),
        cacheKey,
        { revalidate: 60, tags: ["catalog-products"] },
    );

    return await getCachedData();
}
