// /types/backend/product.ts

import { InferSchemaType } from "mongoose";
import { CategorySchema } from "@/models/Category";

export type CategoryDB = InferSchemaType<typeof CategorySchema> & {
    _id: string;
};
