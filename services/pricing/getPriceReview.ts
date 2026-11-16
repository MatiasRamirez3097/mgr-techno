import { Types, isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { ProductLinkSuggestionModel } from "@/models/ProductLinkSuggestion";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";
import { buildAdminProductSearchMatch } from "@/lib/search/adminProductSearch";
import { hasDistributorStock } from "@/lib/distributors/productLinks";
import {
    comparePriceWithCosts,
    resolveMargins,
    type CategoryMarginNode,
    type MarginStatus,
} from "@/lib/priceReview";
import {
    mapProductDistributorLinkToDTO,
    type ProductDistributorLinkDoc,
} from "@/lib/mappers/productDistributorLinkMapper";
import { applyLocalCatalogPrices } from "@/services/distributors/links/applyLocalCatalogPrices";
import { getPricingSettings } from "@/services/settings/getPricingSettings";
import type { ProductDistributorLinkDTO } from "@/types/shared/distributorLink";
import type {
    PriceReviewFilters,
    PriceReviewLinkSuggestion,
    PriceReviewResult,
    PriceReviewRow,
} from "@/types/shared/priceReview";
import { getCategoryMargins } from "./getCategoryMargins";

const DEFAULT_TAX_RATE = 10.5;
// Un cambio de costo se muestra en la tabla durante esta ventana
const RECENT_CHANGE_MS = 7 * 24 * 60 * 60 * 1000;

interface ProductLean {
    _id: Types.ObjectId;
    name: string;
    sku?: string;
    image?: string;
    status: string;
    regularPrice: number;
    salePrice?: number | null;
    effectivePrice: number;
    taxRate?: number;
    categories?: Types.ObjectId[];
}

// Orden de la revisión: primero lo más urgente
const STATUS_ORDER: Record<MarginStatus, number> = { below_min: 0, below_target: 1, ok: 2, no_cost: 3 };

/**
 * Revisión de precios: compara el precio de venta (effectivePrice) de cada producto con el
 * mejor costo con stock de sus distribuidores vinculados, con el margen objetivo/mínimo de
 * su categoría (o el general) y un precio sugerido.
 */
export async function getPriceReview(filters: PriceReviewFilters = {}): Promise<PriceReviewResult> {
    await connectDB();

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));
    const view = filters.view || "linked";

    const query: Record<string, unknown> = {
        type: { $ne: "bundle" },
        slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
    };
    if ((filters.status || "publish") === "publish") query.status = "publish";
    if (filters.stock === "in") query.availableStock = { $gt: 0 };
    else if (filters.stock === "out") query.availableStock = { $not: { $gt: 0 } };

    const searchMatch = buildAdminProductSearchMatch(filters.search || "");
    if (searchMatch) Object.assign(query, searchMatch);

    if (filters.categoryId && isValidObjectId(filters.categoryId)) {
        const descendants: string[] = await getCategoriesDescendants(filters.categoryId);
        query.categories = {
            $in: [filters.categoryId, ...descendants].map((id) => new Types.ObjectId(id)),
        };
    }

    const [settings, categoryList, products] = await Promise.all([
        getPricingSettings(),
        getCategoryMargins(),
        ProductModel.find(query, {
            name: 1, sku: 1, image: 1, status: 1, regularPrice: 1, salePrice: 1,
            effectivePrice: 1, taxRate: 1, categories: 1,
        }).lean<ProductLean[]>(),
    ]);

    const categories = new Map<string, CategoryMarginNode>(categoryList.map((c) => [c.id, c]));

    const productIds = products.map((p) => p._id);
    const [linkDocs, suggestionRefs] = await Promise.all([
        ProductDistributorLinkModel.find({ productId: { $in: productIds } }).lean<ProductDistributorLinkDoc[]>(),
        ProductLinkSuggestionModel.find(
            { dismissedAt: null, productId: { $in: productIds } },
            { productId: 1, distributor: 1 },
        ).lean<{ productId: Types.ObjectId; distributor: string }[]>(),
    ]);
    const links = await applyLocalCatalogPrices(linkDocs.map(mapProductDistributorLinkToDTO));

    const linksByProduct = new Map<string, ProductDistributorLinkDTO[]>();
    for (const link of links) {
        linksByProduct.set(link.productId, [...(linksByProduct.get(link.productId) ?? []), link]);
    }

    const allRows: PriceReviewRow[] = products.map((product) => {
        const productId = product._id.toString();
        const margins = resolveMargins(
            (product.categories ?? []).map((c) => c.toString()),
            categories,
            settings,
        );
        const costs = (linksByProduct.get(productId) ?? []).map((l) => ({
            distributor: l.distributor,
            name: l.name,
            link: l.link,
            price: l.lastPrice,
            stock: l.lastStock,
            stockLabel: l.lastStockLabel,
            inStock: hasDistributorStock(l.lastStock, l.lastStockLabel),
            available: l.available,
            lastCheckedAt: l.lastCheckedAt,
            recentChange:
                l.previousPrice && l.lastPrice && l.priceChangedAt &&
                Date.now() - new Date(l.priceChangedAt).getTime() < RECENT_CHANGE_MS
                    ? (l.lastPrice - l.previousPrice) / l.previousPrice
                    : null,
        }));
        const effectivePrice = Number(product.effectivePrice) || 0;
        const comparison = comparePriceWithCosts({
            effectivePrice,
            costs,
            targetMarginPercent: margins.targetMarginPercent,
            minMarginPercent: margins.minMarginPercent,
            roundingStep: settings.priceRoundingStep,
        });

        return {
            productId,
            name: product.name,
            sku: product.sku || "",
            image: product.image || null,
            status: product.status,
            regularPrice: Number(product.regularPrice) || 0,
            salePrice: product.salePrice ?? null,
            effectivePrice,
            costs: costs.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
            ...comparison,
            lastPurchaseCost: null,
            lastPurchaseAt: null,
            targetMarginPercent: margins.targetMarginPercent,
            minMarginPercent: margins.minMarginPercent,
            marginSource: margins.targetSource,
            linkSuggestions: [],
        };
    });

    // Una sugerencia deja de valer cuando el producto ya se vinculó con ese distribuidor
    const linkedPairs = new Set(links.map((l) => `${l.productId}:${l.distributor}`));
    const withSuggestions = new Set(
        suggestionRefs
            .map((s) => `${s.productId.toString()}:${s.distributor}`)
            .filter((pair) => !linkedPairs.has(pair))
            .map((pair) => pair.split(":")[0]),
    );
    const hasSuggestions = (r: PriceReviewRow) => withSuggestions.has(r.productId);

    const isLinked = (r: PriceReviewRow) => r.costs.length > 0;
    const isNoStock = (r: PriceReviewRow) => isLinked(r) && r.bestCost === null;

    const summary = {
        linked: allRows.filter(isLinked).length,
        unlinked: allRows.filter((r) => !isLinked(r)).length,
        belowMin: allRows.filter((r) => r.marginStatus === "below_min").length,
        belowTarget: allRows.filter((r) => r.marginStatus === "below_target").length,
        noStock: allRows.filter(isNoStock).length,
        withSuggestions: allRows.filter(hasSuggestions).length,
    };

    const filtered = allRows.filter((r) => {
        switch (view) {
            case "linked":
                return isLinked(r);
            case "below_min":
                return r.marginStatus === "below_min";
            case "below_target":
                return r.marginStatus === "below_min" || r.marginStatus === "below_target";
            case "no_stock":
                return isNoStock(r);
            case "unlinked":
                return !isLinked(r);
            case "suggested":
                return hasSuggestions(r);
            default:
                return true;
        }
    });

    filtered.sort(
        (a, b) =>
            STATUS_ORDER[a.marginStatus] - STATUS_ORDER[b.marginStatus] ||
            (a.margin ?? Infinity) - (b.margin ?? Infinity) ||
            a.name.localeCompare(b.name, "es"),
    );

    const total = filtered.length;
    const rows = filtered.slice((page - 1) * limit, page * limit);
    await Promise.all([
        attachLastPurchaseCosts(rows, new Map(products.map((p) => [p._id.toString(), p.taxRate]))),
        attachLinkSuggestions(rows.filter(hasSuggestions)),
    ]);

    return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)), summary };
}

/** Sugerencias de vínculo pendientes de cada fila, en los distribuidores que no tiene vinculados. */
async function attachLinkSuggestions(rows: PriceReviewRow[]): Promise<void> {
    if (rows.length === 0) return;
    const docs = await ProductLinkSuggestionModel.find({
        dismissedAt: null,
        productId: { $in: rows.map((r) => new Types.ObjectId(r.productId)) },
    })
        .sort({ score: -1, price: 1 })
        .lean<(Omit<PriceReviewLinkSuggestion, "id"> & { _id: Types.ObjectId; productId: Types.ObjectId })[]>();

    const byProduct = new Map<string, PriceReviewLinkSuggestion[]>();
    for (const { _id, productId, ...doc } of docs) {
        const list = byProduct.get(productId.toString()) ?? [];
        list.push({
            id: _id.toString(),
            distributor: doc.distributor,
            distributorProductId: doc.distributorProductId,
            distributorSku: doc.distributorSku ?? "",
            name: doc.name,
            link: doc.link ?? null,
            image: doc.image ?? null,
            price: Number(doc.price) || 0,
            stock: Number(doc.stock) || 0,
            stockLabel: doc.stockLabel ?? null,
            matchMethod: doc.matchMethod,
            matchedValue: doc.matchedValue ?? "",
            score: Number(doc.score) || 0,
        });
        byProduct.set(productId.toString(), list);
    }
    for (const row of rows) {
        const linked = new Set(row.costs.map((c) => c.distributor));
        row.linkSuggestions = (byProduct.get(row.productId) ?? []).filter((s) => !linked.has(s.distributor));
    }
}

/** Último costo de compra (InventoryItem.unitCost, neto) de cada fila, pasado a c/IVA. */
async function attachLastPurchaseCosts(
    rows: PriceReviewRow[],
    taxRates: Map<string, number | undefined>,
): Promise<void> {
    if (rows.length === 0) return;
    const last = await InventoryItemModel.aggregate<{ _id: Types.ObjectId; unitCost: number; createdAt: Date }>([
        {
            $match: {
                productId: { $in: rows.map((r) => new Types.ObjectId(r.productId)) },
                unitCost: { $gt: 0 },
            },
        },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$productId", unitCost: { $first: "$unitCost" }, createdAt: { $first: "$createdAt" } } },
    ]);
    const byProduct = new Map(last.map((l) => [l._id.toString(), l]));
    for (const row of rows) {
        const item = byProduct.get(row.productId);
        if (!item) continue;
        const taxRate = taxRates.get(row.productId) ?? DEFAULT_TAX_RATE;
        row.lastPurchaseCost = Math.round(item.unitCost * (1 + taxRate / 100) * 100) / 100;
        row.lastPurchaseAt = new Date(item.createdAt).toISOString();
    }
}
