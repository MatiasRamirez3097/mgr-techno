import { generatePdf } from "@/lib/pdf/generators/generatePdf";
import { quoteDocumentTemplate } from "@/lib/pdf/templates/quoteDocumentTemplate";
import { getQuoteById } from "./getQuoteById";
import type { QuoteDTO } from "@/types/shared/quote";

export async function generateQuotePdf(quoteOrId: string | QuoteDTO): Promise<{
    buffer: Buffer;
    fileName: string;
}> {
    let quote: QuoteDTO | null = null;
    if (typeof quoteOrId === "string") {
        quote = await getQuoteById(quoteOrId);
        if (!quote) {
            throw new Error("Presupuesto no encontrado");
        }
    } else {
        quote = quoteOrId;
    }

    const html = quoteDocumentTemplate(quote);
    const buffer = await generatePdf(html);

    const safeNumber = quote.number.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Presupuesto_${safeNumber}.pdf`;

    return {
        buffer,
        fileName,
    };
}
