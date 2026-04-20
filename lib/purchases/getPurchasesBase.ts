// /lib/products/getProductsBase.ts

import { PurchaseModel } from "@/models/Purchase";
import { mapPurchasesToDTO } from "@/lib/mappers/purchaseMapper";
import { connectDB } from "@/lib/mongodb";
import type { PurchaseDTO } from "@/types/shared/purchase";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getPurchasesBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<PurchaseDTO[]> {
    await connectDB();

    const products = await PurchaseModel.find({
        status: "publish",
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();

    return products.map(mapPurchaseToDTO);
}
