import { PurchaseModel } from "@/models/Purchase";
import { connectDB } from "../mongodb";
import { mapPurchaseToDTO } from "../mappers/purchaseMapper";

export async function getPurchasesById(
    id: string,
    getProduct: boolean = false,
) {
    await connectDB();
    const purchase = getProduct
        ? await PurchaseModel.findById(id).populate("items.productId").lean()
        : await PurchaseModel.findById(id).lean();

    return mapPurchaseToDTO(purchase);
}
