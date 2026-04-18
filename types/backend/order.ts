import { InferSchemaType, Types } from "mongoose";
import { OrderSchema } from "@/models/Order";

export type OrderDB = InferSchemaType<typeof OrderSchema> & {
    _id: Types.ObjectId;
};

export type OrderLineItemDB = {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
};
