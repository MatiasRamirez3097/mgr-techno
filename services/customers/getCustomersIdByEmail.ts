import { CustomerModel } from "@/models";
import { connectDB } from "@/lib/mongodb";
import {
    mapCustomerToDTO,
    mapCustomerWithOrdersToDTO,
} from "@/lib/mappers/customerMapper";
import { Types } from "mongoose";
import { CustomerWithOrdersDB } from "@/types/backend/customer";

export async function getCustomersIdByEmail(email: string) {
    console.log(">>>email:", email);
    await connectDB();
    const customer = await CustomerModel.findOne({ email }).lean();

    return customer;
}
