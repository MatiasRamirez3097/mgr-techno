import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";

/** Borra un vínculo; devuelve false si no existe o no pertenece al producto. */
export async function unlinkProductDistributor(productId: string, linkId: string): Promise<boolean> {
    if (!isValidObjectId(productId) || !isValidObjectId(linkId)) return false;
    await connectDB();
    const result = await ProductDistributorLinkModel.deleteOne({ _id: linkId, productId });
    return result.deletedCount > 0;
}
