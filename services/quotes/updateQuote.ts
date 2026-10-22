import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { calculateQuoteTotals } from "./calculateQuoteTotals";
import { mapQuoteToDTO } from "./mapQuoteToDTO";
import type { UpdateQuoteDTO, QuoteDTO } from "@/types/shared/quote";

export async function updateQuote(id: string, dto: UpdateQuoteDTO): Promise<QuoteDTO | null> {
    await connectDB();

    const existing = await QuoteModel.findById(id);
    if (!existing) {
        return null;
    }

    if (dto.items && dto.items.length > 0) {
        const { itemsWithSubtotals, subtotal, ivaTotal, discountTotal, total } =
            calculateQuoteTotals(dto.items);

        existing.items = itemsWithSubtotals as any;
        existing.subtotal = subtotal;
        existing.ivaTotal = ivaTotal;
        existing.discountTotal = discountTotal;
        existing.total = total;
    }

    if (dto.customer) {
        existing.customer = {
            ...existing.customer,
            ...dto.customer,
        };
    }

    if (dto.customerId !== undefined) {
        existing.customerId = dto.customerId || null;
    }

    if (dto.expirationDate) {
        existing.expirationDate = new Date(dto.expirationDate);
    }

    if (dto.date) {
        existing.date = new Date(dto.date);
    }

    if (dto.status) {
        existing.status = dto.status;
    }

    if (dto.currency) {
        existing.currency = dto.currency;
    }

    if (dto.exchangeRate !== undefined) {
        existing.exchangeRate = dto.exchangeRate;
    }

    if (dto.notes !== undefined) {
        existing.notes = dto.notes;
    }

    if (dto.terms !== undefined) {
        existing.terms = dto.terms;
    }

    const saved = await existing.save();
    return mapQuoteToDTO(saved);
}
