import { CustomerModel } from "@/models/Customer";
import { connectDB } from "../mongodb";
import {
    mapCustomerToDTO,
    mapCustomerWithOrdersToDTO,
} from "../mappers/customerMapper";
import { Types } from "mongoose";
import { CustomerWithOrdersDB } from "@/types/backend/customer";

export async function getCustomersById(id: string) {
    await connectDB();
    const customer = await CustomerModel.findById(id).lean();

    return mapCustomerToDTO(customer);
}

export async function getCustomersByIdWIthOrders(id: string) {
    const result = await CustomerModel.aggregate<CustomerWithOrdersDB>([
        {
            $match: { _id: new Types.ObjectId(id) },
        },
        {
            $lookup: {
                from: "orders", // nombre de la colección (ojo pluralización)
                localField: "_id",
                foreignField: "customerId",
                as: "orders",
            },
        },
    ]);

    const customer = result.at(0);
    if (!customer) return null;
    return mapCustomerWithOrdersToDTO(customer);
}
