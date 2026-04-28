import { PurchaseModel } from "@/models/Purchase";
import { connectDB } from "../mongodb";
import { mapPurchaseToDTO } from "../mappers/purchaseMapper";

export async function getPurchasesById(id: string) {
    await connectDB();

    const purchase = await PurchaseModel.findById(id).lean();

    return mapPurchaseToDTO(purchase);
}
