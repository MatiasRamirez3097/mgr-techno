import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import {
    mapCustomerToDTO,
    mapCustomerWithOrdersToDTO,
} from "@/lib/mappers/customerMapper";
import { CustomerWithOrdersDB } from "@/types/backend/customer";
//CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../constants/pagination";

//FUNCTIONS
//import { getMongoSort } from "./utils";

//TYPES
//import type { GetProductsResponse } from "@/types/shared/purchase";
import type { CustomerFilters } from "@/types/shared/customer";

export async function getCustomers(
    filters: CustomerFilters = {},
): Promise<GetCustomerResponse> {
    await connectDB();
    const page = filters.page || 1;
    //const sort = getMongoSort(filters.orderby);

    // Construir query
    const query: any = {};

    if (filters.search) {
        query.$text = { $search: filters.search };
    }

    const res = await CustomerModel.find({ ...query })
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
        customers: paginated.map(mapCustomerToDTO),
        totalPages,
        total,
    };
}

export async function getCustomersWithOrders(
    filters: CustomerFilters = {},
): Promise<GetCustomerResponse> {
    await connectDB();

    const page = filters.page || 1;
    const limit = PRODUCTS_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const match: any = {};

    if (filters.search) {
        match.$or = [
            { firstName: { $regex: filters.search, $options: "i" } },
            { lastName: { $regex: filters.search, $options: "i" } },
            { email: { $regex: filters.search, $options: "i" } },
        ];
    }

    const pipeline = [
        { $match: match },

        // 🔥 join con orders
        {
            $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "customerId",
                as: "orders",
            },
        },

        // opcional: ordenar customers
        { $sort: { createdAt: -1 } },

        // 🔥 facet para paginación + total en una sola query
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: "count" }],
            },
        },
    ];

    const result = await CustomerModel.aggregate<{
        data: CustomerWithOrdersDB[];
        totalCount: { count: number }[];
    }>(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
        customers: data.map(mapCustomerWithOrdersToDTO),
        total,
        totalPages,
    };
}
