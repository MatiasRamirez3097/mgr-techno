import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { mapQuoteToDTO } from "./mapQuoteToDTO";
import type { QuoteDTO } from "@/types/shared/quote";

export async function getQuoteById(id: string): Promise<QuoteDTO | null> {
    await connectDB();
    const doc = await QuoteModel.findById(id).lean();
    if (!doc) return null;
    return mapQuoteToDTO(doc);
}

export async function deleteQuote(id: string): Promise<boolean> {
    await connectDB();
    const res = await QuoteModel.findByIdAndDelete(id);
    return Boolean(res);
}
