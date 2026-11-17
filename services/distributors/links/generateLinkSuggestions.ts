import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { ProductLinkSuggestionModel } from "@/models/ProductLinkSuggestion";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import { acquireSyncLock, releaseSyncLock } from "@/services/distributors/syncLock";
import { fetchElitCatalog } from "@/services/distributors/elit/fetchElitCatalog";
import { requestNewBytesProducts } from "@/services/distributors/newbytes/requestNewBytesProducts";
import { mapNewBytesProduct } from "@/lib/distributors/newbytesMapper";
import { toDistributorKey } from "@/lib/distributors/productLinks";
import {
    buildLinkSuggestions,
    suggestionKey,
    type SuggestionCatalogItem,
} from "@/lib/distributors/linkSuggestions";
import type { NormalizedProduct } from "@/types/shared/distributor";
import type { DistributorKey } from "@/types/shared/distributorLink";
import { getAllLocalCatalogItemsWithCodes } from "./localCatalogItems";

export const LINK_SUGGESTIONS_STATE_ID = "link-suggestions";
const LOCK_MS = 10 * 60 * 1000;

export interface GenerateLinkSuggestionsResult {
    skipped?: boolean;
    suggestions: number;
    products: number;
    // Distribuidores cuyo catálogo se pudo leer (los demás conservan sus sugerencias anteriores)
    distributors: DistributorKey[];
    errors: string[];
}

interface ProductLean {
    _id: { toString(): string };
    name: string;
    mpn?: string;
    sku?: string;
    gtin?: string;
}

function fromNormalized(p: NormalizedProduct): SuggestionCatalogItem[] {
    const distributor = toDistributorKey(p.distributor);
    if (!distributor) return [];
    return [
        {
            distributor,
            distributorProductId: String(p.id),
            distributorSku: p.sku,
            partNumber: p.sku,
            ean: "",
            name: p.name,
            link: p.link,
            image: p.image,
            price: p.price,
            stock: p.stock,
            ...(p.stockLabel ? { stockLabel: p.stockLabel } : {}),
        },
    ];
}

/**
 * Busca en los catálogos de los cuatro distribuidores posibles equivalentes de los productos
 * no vinculados (por part number, EAN o nombre parecido) y los guarda como sugerencias para
 * revisar en /admin/comparator/pricing. No crea vínculos.
 */
export async function generateLinkSuggestions(): Promise<GenerateLinkSuggestionsResult> {
    await connectDB();

    const result: GenerateLinkSuggestionsResult = { suggestions: 0, products: 0, distributors: [], errors: [] };
    if (!(await acquireSyncLock(LINK_SUGGESTIONS_STATE_ID, LOCK_MS))) return { ...result, skipped: true };

    try {
        const [products, links, dismissedDocs, local, elit, newbytes] = await Promise.all([
            ProductModel.find(
                { type: { $ne: "bundle" }, slug: { $ne: CUSTOM_PC_SYSTEM_SLUG } },
                { name: 1, mpn: 1, sku: 1, gtin: 1 },
            ).lean<ProductLean[]>(),
            ProductDistributorLinkModel.find({}, { productId: 1, distributor: 1 }).lean<
                { productId: { toString(): string }; distributor: DistributorKey }[]
            >(),
            ProductLinkSuggestionModel.find(
                { dismissedAt: { $ne: null } },
                { productId: 1, distributor: 1, distributorProductId: 1 },
            ).lean<{ productId: { toString(): string }; distributor: string; distributorProductId: string }[]>(),
            getAllLocalCatalogItemsWithCodes({ withCodesOnly: false }).catch((err) => {
                result.errors.push(`Invid/AIR/PCMODD: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            }),
            fetchElitCatalog().catch((err) => ({
                products: [] as NormalizedProduct[],
                requests: 0,
                error: `Elit: ${err instanceof Error ? err.message : String(err)}`,
            })),
            requestNewBytesProducts()
                .then((raw) => ({ products: raw.map(mapNewBytesProduct), error: null as string | null }))
                .catch((err) => ({
                    products: [] as NormalizedProduct[],
                    error: `NewBytes: ${err instanceof Error ? err.message : String(err)}`,
                })),
        ]);

        // Sólo se reemplazan las sugerencias de los distribuidores leídos completos
        const items: SuggestionCatalogItem[] = [];
        if (local) {
            items.push(...local);
            result.distributors.push("invid", "air", "pcmodd");
        }
        for (const [key, source] of [["elit", elit], ["newbytes", newbytes]] as const) {
            if (source.error) {
                result.errors.push(source.error);
                continue;
            }
            items.push(...source.products.flatMap(fromNormalized));
            result.distributors.push(key);
        }

        const linkedDistributors = new Map<string, Set<DistributorKey>>();
        for (const link of links) {
            const id = link.productId.toString();
            linkedDistributors.set(id, (linkedDistributors.get(id) ?? new Set()).add(link.distributor));
        }
        const dismissed = new Set(
            dismissedDocs.map((d) => suggestionKey(d.productId.toString(), d.distributor, d.distributorProductId)),
        );

        const suggestions = buildLinkSuggestions(
            products.map((p) => ({ id: p._id.toString(), name: p.name, mpn: p.mpn, sku: p.sku, gtin: p.gtin })),
            items,
            { linkedDistributors, dismissed },
        );

        if (result.distributors.length > 0) {
            await ProductLinkSuggestionModel.deleteMany({
                dismissedAt: null,
                distributor: { $in: result.distributors },
            });
            if (suggestions.length > 0) {
                await ProductLinkSuggestionModel.insertMany(
                    suggestions.map((s) => ({
                        productId: s.productId,
                        distributor: s.item.distributor,
                        distributorProductId: s.item.distributorProductId,
                        distributorSku: s.item.distributorSku,
                        name: s.item.name,
                        link: s.item.link,
                        image: s.item.image,
                        price: s.item.price,
                        stock: s.item.stock,
                        stockLabel: s.item.stockLabel ?? null,
                        matchMethod: s.matchMethod,
                        matchedValue: s.matchedValue,
                        score: s.score,
                    })),
                    // Si una sugerencia ya existía (otro proceso en paralelo), se sigue con las demás
                    { ordered: false },
                ).catch((err: { insertedDocs?: unknown[] }) => {
                    if (!Array.isArray(err.insertedDocs)) throw err;
                });
            }
        }

        result.suggestions = suggestions.length;
        result.products = new Set(suggestions.map((s) => s.productId)).size;

        const now = new Date();
        await DistributorSyncStateModel.updateOne(
            { _id: LINK_SUGGESTIONS_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: now,
                    lastSyncStatus:
                        result.errors.length === 0 ? "ok" : result.distributors.length > 0 ? "partial" : "error",
                    lastSyncError: result.errors.length > 0 ? result.errors.join(" | ").slice(0, 1000) : null,
                    lastSyncItems: result.suggestions,
                    ...(result.distributors.length > 0 ? { lastSuccessfulSyncAt: now } : {}),
                },
            },
        );

        return result;
    } finally {
        await releaseSyncLock(LINK_SUGGESTIONS_STATE_ID);
    }
}
