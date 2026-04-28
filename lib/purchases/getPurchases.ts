// /lib/products/getProducts.ts
import { connectDB } from "@/lib/mongodb";
import { PurchaseModel } from "@/models/Purchase";
import { mapPurchaseToDTO } from "@/lib/mappers/purchaseMapper";
//CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../constants/pagination";

//FUNCTIONS
//import { getMongoSort } from "./utils";

//TYPES
import type { GetProductsResponse } from "@/types/shared/purchase";
import type { PurchaseFilters } from "@/types/shared/purchase";

export async function getPurchases(
    filters: PurchaseFilters = {},
): Promise<GetProductsResponse> {
    await connectDB();
    const page = filters.page || 1;
    //const sort = getMongoSort(filters.orderby);

    // Construir query
    const query: any = {};

    if (filters.search) {
        query.$text = { $search: filters.search };
    }

    const res = await PurchaseModel.find({ ...query })
        //.sort(sort)
        .lean();
    // Filtro adicional por nombre si hay búsqueda (por si $text no está disponible)
    const filtered = filters.search
        ? res.filter((p) =>
              p.name.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : res;

    const total = filtered.length;
    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);
    const start = (page - 1) * PRODUCTS_PAGE_SIZE;
    const paginated = filtered.slice(start, start + PRODUCTS_PAGE_SIZE);

    return {
        purchases: paginated.map(mapPurchaseToDTO),
        totalPages,
        total,
    };
}
