import { PurchaseModel } from "@/models/Purchase";
import { connectDB } from "../mongodb";
import { mapPurchaseToDTO } from "../mappers/purchaseMapper";
import type { PurchaseDTO } from "@/types/shared/purchase";

export async function getPurchasesById(
    id: string,
    getProduct: boolean = false,
): Promise<PurchaseDTO | null> {
    await connectDB();
    const purchase = getProduct
        ? await PurchaseModel.findById(id).populate("items.productId").lean()
        : await PurchaseModel.findById(id).lean();

    if (!purchase) {
        return null;
    }

    if (getProduct) {
        return mapPurchaseToDTO(purchase, {
            includeProducts: true,
        });
    }

    return mapPurchaseToDTO(purchase);
}
