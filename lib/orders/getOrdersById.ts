import { connectDB } from "@/lib/mongodb";

import { OrderDTO } from "@/types/shared/order";

import { InventoryItemModel, OrderModel } from "@/models";

import { mapOrderToDTO } from "../mappers/orderMapper";

export async function getOrdersById(id: string): Promise<OrderDTO | null> {
    await connectDB();

    const order = await OrderModel.findById(id)
        .populate({
            path: "items.allocations.inventoryItemId",
            //select: "serialNumber",
        })
        .lean();

    if (!order) {
        return null;
    }

    return mapOrderToDTO(order);
}
