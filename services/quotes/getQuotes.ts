import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { mapQuoteToDTO } from "./mapQuoteToDTO";
import type { QuoteDTO, QuoteStatus } from "@/types/shared/quote";

interface GetQuotesOptions {
    page?: number;
    limit?: number;
    status?: QuoteStatus | "all";
    search?: string;
    customerId?: string;
}

export async function getQuotes(options: GetQuotesOptions = {}): Promise<{
    quotes: QuoteDTO[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}> {
    await connectDB();

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 15));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (options.status && options.status !== "all") {
        if (options.status === "expired") {
            query.expirationDate = { $lt: new Date() };
            query.status = { $nin: ["converted", "rejected", "accepted"] };
        } else {
            query.status = options.status;
        }
    }

    if (options.customerId) {
        query.customerId = options.customerId;
    }

    if (options.search?.trim()) {
        const term = options.search.trim();
        query.$or = [
            { number: { $regex: term, $options: "i" } },
            { "customer.name": { $regex: term, $options: "i" } },
            { "customer.documentNumber": { $regex: term, $options: "i" } },
            { "customer.email": { $regex: term, $options: "i" } },
        ];
    }

    const [docs, total] = await Promise.all([
        QuoteModel.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        QuoteModel.countDocuments(query),
    ]);

    return {
        quotes: docs.map(mapQuoteToDTO),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
}
