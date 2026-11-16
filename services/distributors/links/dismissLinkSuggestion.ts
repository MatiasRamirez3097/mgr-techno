import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductLinkSuggestionModel } from "@/models/ProductLinkSuggestion";

/** Marca una sugerencia como descartada: la búsqueda automática no la vuelve a proponer. */
export async function dismissLinkSuggestion(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new Error("Sugerencia no encontrada");
    await connectDB();
    const updated = await ProductLinkSuggestionModel.findByIdAndUpdate(id, { $set: { dismissedAt: new Date() } });
    if (!updated) throw new Error("Sugerencia no encontrada");
}
