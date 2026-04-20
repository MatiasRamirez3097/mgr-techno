import { InferSchemaType, Types } from "mongoose";
import { PurchaseSchema } from "@/models/Purchase";

export type PurchaseDB = InferSchemaType<typeof PurchaseSchema> & {
    _id: Types.ObjectId;
};
