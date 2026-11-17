import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { normalizeSearch } from "@/lib/search/normalize";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { ReferencePageOutcome } from "./fetchReferenceProduct";

export interface PagesSaveResult {
    updated: number;
    notFound: number;
    errors: number;
    priceChanges: number;
}

/**
 * Guarda el resultado de leer páginas de producto. Registra el precio anterior cuando cambia
 * y `missingSince` cuando la página da 404. Ignora URLs que no estén en la lista de la tienda.
 */
export async function saveReferencePages(
    sourceKey: string,
    outcomes: ReferencePageOutcome[],
): Promise<PagesSaveResult> {
    await connectDB();
    const result: PagesSaveResult = { updated: 0, notFound: 0, errors: 0, priceChanges: 0 };
    if (!outcomes.length) return result;

    const existing = await ReferenceCatalogItemModel.find(
        { source: sourceKey, url: { $in: outcomes.map((o) => o.url) } },
        { url: 1, price: 1, missingSince: 1 },
    ).lean<{ url: string; price: number | null; missingSince: Date | null }[]>();
    const byUrl = new Map(existing.map((e) => [e.url, e]));

    const fetchedAt = new Date();
    const operations: AnyBulkWriteOperation[] = [];

    for (const outcome of outcomes) {
        const previous = byUrl.get(outcome.url);
        if (!previous) continue;
        const filter = { source: sourceKey, url: outcome.url };

        if (outcome.status === "not_found") {
            result.notFound++;
            operations.push({
                updateOne: {
                    filter,
                    update: {
                        $set: {
                            fetchedAt,
                            inStock: false,
                            fetchError: "404",
                            missingSince: previous.missingSince ?? fetchedAt,
                        },
                    },
                },
            });
        } else if (outcome.status === "error") {
            result.errors++;
            operations.push({
                updateOne: {
                    filter,
                    update: { $set: { fetchedAt, fetchError: outcome.message.slice(0, 300) } },
                },
            });
        } else {
            const { data } = outcome;
            const priceChanged =
                previous.price !== null && previous.price > 0 && previous.price !== data.price;
            if (priceChanged) result.priceChanges++;
            result.updated++;
            operations.push({
                updateOne: {
                    filter,
                    update: {
                        $set: {
                            ...data,
                            searchText: normalizeSearch(
                                [data.name, data.brand, data.sku, data.gtin].join(" "),
                            ),
                            fetchedAt,
                            fetchError: null,
                            missingSince: null,
                            ...(priceChanged
                                ? { previousPrice: previous.price, priceChangedAt: fetchedAt }
                                : {}),
                        },
                    },
                },
            });
        }
    }

    if (operations.length) {
        await ReferenceCatalogItemModel.bulkWrite(operations, { ordered: false });
    }
    return result;
}
