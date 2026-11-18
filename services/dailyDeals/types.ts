import type { Types } from "mongoose";
import type { DistributorKey } from "@/types/shared/distributorLink";

// Forma en la base de una tanda de ofertas (models/DailyDeal.ts)
export interface DailyDealItemDoc {
    productId: Types.ObjectId;
    name: string;
    slug?: string;
    regularPrice: number;
    previousSalePrice?: number | null;
    dealPrice: number;
    cost: number;
    costDistributor: DistributorKey;
    groupId: string;
    repeated?: boolean;
    restored?: boolean;
}

export interface DailyDealDoc {
    _id: Types.ObjectId;
    date: string;
    startsAt: Date;
    endsAt: Date;
    status: "active" | "finished" | "cancelled";
    items: DailyDealItemDoc[];
}
