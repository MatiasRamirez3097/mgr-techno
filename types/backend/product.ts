// /types/backend/product.ts

import { InferSchemaType } from "mongoose";
import { ProductSchema } from "@/models/Product";

export type ProductDB = InferSchemaType<typeof ProductSchema> & {
    _id: string;
};
