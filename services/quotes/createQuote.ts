import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { generateQuoteNumber } from "./generateQuoteNumber";
import { calculateQuoteTotals } from "./calculateQuoteTotals";
import { mapQuoteToDTO } from "./mapQuoteToDTO";
import { assertNoBundleComponents } from "./assertNoBundleComponents";
import { parseQuoteItems } from "@/lib/validators/quoteItemsSchema";
import type { CreateQuoteDTO, QuoteDTO } from "@/types/shared/quote";

export async function createQuote(dto: CreateQuoteDTO): Promise<QuoteDTO> {
    await connectDB();

    if (!dto.items || dto.items.length === 0) {
        throw new Error("El presupuesto debe contener al menos un producto o ítem");
    }

    if (!dto.customer || !dto.customer.name?.trim()) {
        throw new Error("El nombre del cliente es obligatorio");
    }

    if (!dto.expirationDate) {
        throw new Error("La fecha de vencimiento es obligatoria");
    }

    const items = parseQuoteItems(dto.items);
    await assertNoBundleComponents(items);

    const number = await generateQuoteNumber();
    const { itemsWithSubtotals, subtotal, ivaTotal, discountTotal, total } =
        calculateQuoteTotals(items);

    const doc = new QuoteModel({
        number,
        date: dto.date ? new Date(dto.date) : new Date(),
        expirationDate: new Date(dto.expirationDate),
        status: dto.status || "draft",
        customerId: dto.customerId || null,
        customer: dto.customer,
        items: itemsWithSubtotals,
        currency: dto.currency || "ARS",
        exchangeRate: dto.exchangeRate || 1,
        subtotal,
        ivaTotal,
        discountTotal,
        total,
        notes: dto.notes || "",
        terms: dto.terms || undefined,
    });

    const saved = await doc.save();
    return mapQuoteToDTO(saved);
}
