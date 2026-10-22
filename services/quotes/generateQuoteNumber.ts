import { QuoteModel } from "@/models/Quote";

export async function generateQuoteNumber(): Promise<string> {
    const pointOfSale = 1;
    const prefix = `PRE-${String(pointOfSale).padStart(4, "0")}-`;

    const lastQuote = await QuoteModel.findOne({
        number: { $regex: `^${prefix}` },
    })
        .sort({ createdAt: -1 })
        .select("number")
        .lean();

    let nextSeq = 1;
    if (lastQuote?.number) {
        const parts = lastQuote.number.split("-");
        if (parts.length === 3) {
            const currentSeq = parseInt(parts[2], 10);
            if (!isNaN(currentSeq)) {
                nextSeq = currentSeq + 1;
            }
        }
    }

    return `${prefix}${String(nextSeq).padStart(8, "0")}`;
}
