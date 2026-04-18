import { OrderModel } from "@/models/Order";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";
import { connectDB } from "@/lib/mongodb";
import type { OrderDTO } from "@/types/shared/order";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getOrdersBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<OrderDTO[]> {
    await connectDB();

    const orders = await OrderModel.find({
        //status: "publish",
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();

    return orders.map(mapOrderToDTO);
}
