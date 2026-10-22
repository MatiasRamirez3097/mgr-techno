import { QuoteModel } from "@/models/Quote";
import { getNextSequence } from "@/lib/counters/getNextGenericNumber";

const POINT_OF_SALE = 1;
const PREFIX = `PRE-${String(POINT_OF_SALE).padStart(4, "0")}-`;

// Último número usado antes de pasar a Counter (sólo se lee la primera vez)
async function getLastExistingSequence(): Promise<number> {
    const lastQuote = await QuoteModel.findOne({
        number: { $regex: `^${PREFIX}` },
    })
        .sort({ number: -1 })
        .select("number")
        .lean<{ number?: string }>();

    const seq = parseInt(lastQuote?.number?.slice(PREFIX.length) ?? "", 10);
    return Number.isNaN(seq) ? 0 : seq;
}

export async function generateQuoteNumber(): Promise<string> {
    const seq = await getNextSequence(
        `quote_${POINT_OF_SALE}`,
        getLastExistingSequence,
    );

    return `${PREFIX}${String(seq).padStart(8, "0")}`;
}
