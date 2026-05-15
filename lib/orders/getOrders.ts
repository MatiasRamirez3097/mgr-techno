// /lib/products/getProducts.ts
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";
//CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../constants/pagination";
import { OrderFilters } from "@/types/shared/order";
import { Types } from "mongoose";
//FUNCTIONS
//import { getMongoSort } from "./utils";

//TYPES
import type { OrderDTO } from "@/types/shared/order";
//import type { GetProductsResponse } from "@/types/shared/order";
//import type { ProductFilters } from "@/types/shared/product";

export async function getOrders(filters: OrderFilters = {}) {
    await connectDB();
    const page = filters.page || 1;
    //const sort = getMongoSort(filters.orderby);
    //const adminView = filters.adminView ? true : false;

    // Construir query
    const query: any = {};

    //if (filters.search) {
    //    query.$text = { $search: filters.search };
    //}

    if (filters.customerId) {
        query.customerId = new Types.ObjectId(filters.customerId);
    }

    const res = await OrderModel.find({ ...query })
        .sort({ createdAt: -1 })
        .lean();
    // Filtro adicional por nombre si hay búsqueda (por si $text no está disponible)
    /*const filtered = filters.search
        ? res.filter((p) =>
              p.name.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : res;
    */
    const total = res.length;
    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);
    const start = (page - 1) * PRODUCTS_PAGE_SIZE;
    const paginated = res.slice(start, start + PRODUCTS_PAGE_SIZE);
    return {
        orders: paginated.map(mapOrderToDTO),
        totalPages,
        total,
    };
}
