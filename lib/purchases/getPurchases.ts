import { connectDB } from "@/lib/mongodb";
import { PurchaseModel } from "@/models/Purchase";
import { mapPurchaseToDTO } from "@/lib/mappers/purchaseMapper";
import { PRODUCTS_PAGE_SIZE } from "@/constants/pagination";
import type { GetProductsResponse, PurchaseFilters } from "@/types/shared/purchase";

export async function getPurchases(
    filters: PurchaseFilters = {},
): Promise<GetProductsResponse> {
    await connectDB();
    const page = Math.max(1, filters.page || 1);
    const limit = PRODUCTS_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.status && filters.status !== "all") {
        query.status = filters.status;
    }

    if (filters.search && filters.search.trim()) {
        const searchRegex = new RegExp(filters.search.trim(), "i");
        query.$or = [
            { supplierName: searchRegex },
            { "document.number": searchRegex },
            { notes: searchRegex },
        ];
    }

    const [purchases, total] = await Promise.all([
        PurchaseModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        PurchaseModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        purchases: purchases.map((purchase) => mapPurchaseToDTO(purchase)),
        totalPages,
        total,
    };
}
