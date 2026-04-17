import { InferSchemaType } from "mongoose";
import { InventoryItemSchema } from "@/models/InventoryItem";

export type InventoryItemDB = InferSchemaType<typeof InventoryItemSchema> & {
    _id: string;
};
