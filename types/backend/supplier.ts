import { InferSchemaType, Types } from "mongoose";
import { SupplierSchema } from "@/models/Supplier";

export type SupplierDB = InferSchemaType<typeof SupplierSchema> & {
    _id: Types.ObjectId;
};
