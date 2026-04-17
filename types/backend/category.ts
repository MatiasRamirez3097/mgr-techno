// /types/backend/product.ts

import { InferSchemaType, Types } from "mongoose";
import { CategorySchema } from "@/models/Category";

export type CategoryDB = InferSchemaType<typeof CategorySchema> & {
    _id: Types.ObjectId;
};
