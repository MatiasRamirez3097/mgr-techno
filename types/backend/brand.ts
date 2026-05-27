// /types/backend/product.ts

import { InferSchemaType, Types } from "mongoose";
import { BrandSchema } from "@/models/Brand";

export type BrandDB = InferSchemaType<typeof BrandSchema> & {
    _id: Types.ObjectId;
};
