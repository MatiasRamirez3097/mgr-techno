import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { syncLinkedFlags } from "./syncLinkedFlags";

export async function unlinkProductReference(productId: string, linkId: string): Promise<void> {
    if (!isValidObjectId(productId) || !isValidObjectId(linkId)) {
        throw new Error("Vínculo no encontrado");
    }
    await connectDB();
    // Se marca como descartado en vez de borrarlo, para que la vinculación automática no lo rehaga
    const link = await ProductReferenceLinkModel.findOneAndUpdate(
        { _id: linkId, productId, dismissed: { $ne: true } },
        { $set: { dismissed: true } },
    ).lean<{ itemId: unknown }>();
    if (!link) throw new Error("Vínculo no encontrado");
    await syncLinkedFlags([link.itemId]);
}
