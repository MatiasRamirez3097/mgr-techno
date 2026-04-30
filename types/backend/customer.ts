// /types/backend/product.ts

import { InferSchemaType, Types } from "mongoose";
import { CustomerSchema } from "@/models/Customer";
import { OrderDB } from "./order";

export type CustomerDB = InferSchemaType<typeof CustomerSchema> & {
    _id: Types.ObjectId;
};

export type CustomerWithOrdersDB = CustomerDB & {
    orders: OrderDB[];
};
