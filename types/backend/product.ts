import { InferSchemaType, Types } from "mongoose";
import { ProductSchema } from "@/models/Product";

export type ProductDB = InferSchemaType<typeof ProductSchema> & {
    _id: Types.ObjectId;
};
