// /lib/products/getProducts.ts
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { CategoryModel } from "@/models/Category";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { getCategoriesDescendants } from "@/lib/categories/getCategoriesDescendants";
//CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../constants/pagination";

//FUNCTIONS
import { getMongoSort } from "./utils";

//TYPES
import type { ProductDTO } from "@/types/shared/product";
import type { GetProductsResponse } from "@/types/shared/product";
import type { ProductFilters } from "@/types/shared/product";

export async function getProducts(
    filters: ProductFilters = {},
): Promise<GetProductsResponse> {
    await connectDB();
    const page = filters.page || 1;
    const sort = getMongoSort(filters.orderby);

    // Construir query
    const query: any = { status: "publish" };

    if (filters.search) {
        query.$text = { $search: filters.search };
    }

    if (filters.category) {
        const category = await CategoryModel.findOne({
            slug: filters.category,
        }).lean();

        if (category) {
            const childIds = await getCategoriesDescendants(
                category._id.toString(),
            );

            const allCategoryIds = [category._id.toString(), ...childIds];

            query.categories = { $in: allCategoryIds };
            console.log(query.categories);
        } else {
            query._id = null;
        }
    }

    // Separamos en stock y sin stock
    const [inStock, outOfStock] = await Promise.all([
        ProductModel.find({ ...query, stockStatus: "instock" })
            .sort(sort)
            .lean(),
        ProductModel.find({ ...query, stockStatus: "outofstock" })
            .sort(sort)
            .lean(),
    ]);

    const all = [...inStock, ...outOfStock];

    // Filtro adicional por nombre si hay búsqueda (por si $text no está disponible)
    const filtered = filters.search
        ? all.filter((p) =>
              p.name.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : all;

    const total = filtered.length;
    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);
    const start = (page - 1) * PRODUCTS_PAGE_SIZE;
    const paginated = filtered.slice(start, start + PRODUCTS_PAGE_SIZE);

    return {
        products: paginated.map(mapProductToDTO),
        totalPages,
        total,
    };
}
