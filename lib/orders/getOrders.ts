// /lib/products/getProducts.ts
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";
//CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../../constants/pagination";
import { OrderFilters } from "@/types/shared/order";
import { Types } from "mongoose";
//FUNCTIONS
//import { getMongoSort } from "./utils";

export async function getOrders(filters: OrderFilters = {}) {
    await connectDB();
    const page = Math.max(1, filters.page || 1);

    // Construir query
    const query: Record<string, unknown> = {};

    if (filters.customerId) {
        query.customerId = new Types.ObjectId(filters.customerId);
    }

    const skip = (page - 1) * PRODUCTS_PAGE_SIZE;

    const [orders, total] = await Promise.all([
        OrderModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(PRODUCTS_PAGE_SIZE)
            .lean(),
        OrderModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);

    return {
        orders: orders.map(mapOrderToDTO),
        totalPages,
        total,
    };
}
