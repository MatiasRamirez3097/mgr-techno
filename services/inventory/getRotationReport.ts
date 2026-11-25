import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { OrderModel } from "@/models/Order";
import { PendingSaleModel } from "@/models/PendingSale";
import { PurchaseModel } from "@/models/Purchase";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import { hasDistributorStock } from "@/lib/distributors/productLinks";
import { evaluateRotation, type RotationLot } from "@/lib/inventory/rotation";
import {
    mapProductDistributorLinkToDTO,
    type ProductDistributorLinkDoc,
} from "@/lib/mappers/productDistributorLinkMapper";
import { compareWithReferences } from "@/lib/priceReview";
import { applyLocalCatalogPrices } from "@/services/distributors/links/applyLocalCatalogPrices";
import { getReferencesForProducts } from "@/services/priceReference/links/getReferencesForProducts";
import { getRotationSettings } from "@/services/settings/getRotationSettings";
import type { RotationReason, RotationReport, RotationRow } from "@/types/shared/stockRotation";

const DEFAULT_TAX_RATE = 10.5;
const DAY_MS = 24 * 60 * 60 * 1000;

// Pedidos que cuentan como venta: no anulados y, si vienen de la tienda, cobrados
// (un pedido web sin pagar puede no concretarse nunca).
const SOLD_ORDER_MATCH = {
    status: { $nin: ["cancelled", "refunded", "failed"] },
    $or: [{ source: "admin" }, { paymentStatus: { $in: ["paid", "partial"] } }],
};

interface ProductLean {
    _id: Types.ObjectId;
    name: string;
    sku?: string;
    image?: string;
    effectivePrice: number;
    taxRate?: number;
    availableStock?: number;
    reservedStock?: number;
    createdAt?: Date;
}

interface LotLean {
    productId: Types.ObjectId;
    purchaseId?: Types.ObjectId | null;
    remainingQuantity: number;
    unitCost?: number | null;
    createdAt: Date;
}

/** Alícuota de IVA de cada ítem de compra, por `compra:producto`. */
async function getPurchaseTaxRates(lots: LotLean[]): Promise<Map<string, number>> {
    const purchaseIds = [...new Set(lots.flatMap((l) => (l.purchaseId ? [l.purchaseId.toString()] : [])))];
    if (purchaseIds.length === 0) return new Map();
    const purchases = await PurchaseModel.find(
        { _id: { $in: purchaseIds.map((id) => new Types.ObjectId(id)) } },
        { "items.productId": 1, "items.taxRate": 1 },
    ).lean<{ _id: Types.ObjectId; items?: { productId: Types.ObjectId; taxRate?: number }[] }[]>();
    const rates = new Map<string, number>();
    for (const purchase of purchases) {
        for (const item of purchase.items ?? []) {
            if (typeof item.taxRate === "number") {
                rates.set(`${purchase._id.toString()}:${item.productId.toString()}`, item.taxRate);
            }
        }
    }
    return rates;
}

interface SalesAgg {
    _id: Types.ObjectId;
    units: number;
    lastSaleAt: Date;
}

/**
 * Ventas por producto: ítems de pedidos (los combos suman a sus componentes) más las ventas
 * escaneadas que todavía no se formalizaron. Las unidades cuentan desde `windowStart`; la última
 * venta se busca desde `since` (más atrás), para saber hace cuánto no se vende algo.
 */
async function getSalesByProduct(
    since: Date,
    windowStart: Date,
): Promise<Map<string, { units: number; lastSaleAt: Date }>> {
    const unitsInWindow = (qty: string) => ({ $sum: { $cond: [{ $gte: ["$createdAt", windowStart] }, qty, 0] } });
    const [orderSales, pendingSales] = await Promise.all([
        OrderModel.aggregate<SalesAgg>([
            { $match: { createdAt: { $gte: since }, ...SOLD_ORDER_MATCH } },
            { $unwind: "$items" },
            {
                $project: {
                    createdAt: 1,
                    lines: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$items.bundleComponents", []] } }, 0] },
                            {
                                $map: {
                                    input: "$items.bundleComponents",
                                    as: "c",
                                    in: { productId: "$$c.productId", quantity: "$$c.totalQuantity" },
                                },
                            },
                            [{ productId: "$items.productId", quantity: "$items.quantity" }],
                        ],
                    },
                },
            },
            { $unwind: "$lines" },
            {
                $group: {
                    _id: "$lines.productId",
                    units: unitsInWindow("$lines.quantity"),
                    lastSaleAt: { $max: "$createdAt" },
                },
            },
        ]),
        PendingSaleModel.aggregate<SalesAgg>([
            { $match: { status: "pending", createdAt: { $gte: since } } },
            { $group: { _id: "$productId", units: unitsInWindow("$quantity"), lastSaleAt: { $max: "$createdAt" } } },
        ]),
    ]);

    const sales = new Map<string, { units: number; lastSaleAt: Date }>();
    for (const s of [...orderSales, ...pendingSales]) {
        const key = s._id.toString();
        const prev = sales.get(key);
        sales.set(key, {
            units: (prev?.units ?? 0) + s.units,
            lastSaleAt: prev && prev.lastSaleAt > s.lastSaleAt ? prev.lastSaleAt : s.lastSaleAt,
        });
    }
    return sales;
}

/**
 * "Stock a rotar": por cada producto con stock, ritmo de venta, antigüedad de sus unidades
 * (lotes de compra), costo inmovilizado y costo de reposición actual, con los motivos para
 * empujar su venta. Si está habilitado, también lo que se vende rápido y conviene reponer.
 */
export async function getRotationReport(now = new Date()): Promise<RotationReport> {
    await connectDB();
    const settings = await getRotationSettings();
    const windowStart = new Date(now.getTime() - settings.rotationSalesWindowDays * DAY_MS);
    // La última venta se busca hasta el umbral de "lento", que puede ir más atrás que la ventana
    const lookbackDays = Math.max(settings.rotationSalesWindowDays, settings.rotationSlowCoverageDays);
    const since = new Date(now.getTime() - lookbackDays * DAY_MS);

    const sales = await getSalesByProduct(since, windowStart);
    const soldIds = [...sales.entries()]
        .filter(([, s]) => s.units > 0)
        .map(([id]) => new Types.ObjectId(id));

    const products = await ProductModel.find(
        {
            type: { $ne: "bundle" },
            slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
            // Los que no controlan stock no tienen unidades reales que rotar
            manageStock: { $ne: false },
            // Con stock, o (para "reponer") vendido en la ventana
            $or: [
                { availableStock: { $gt: 0 } },
                ...(settings.rotationRestockEnabled ? [{ _id: { $in: soldIds } }] : []),
            ],
        },
        {
            name: 1, sku: 1, image: 1, effectivePrice: 1, taxRate: 1,
            availableStock: 1, reservedStock: 1, createdAt: 1,
        },
    ).lean<ProductLean[]>();

    const productIds = products.map((p) => p._id);
    const [lotDocs, linkDocs, referencesByProduct] = await Promise.all([
        InventoryItemModel.find(
            { productId: { $in: productIds }, status: "available", remainingQuantity: { $gt: 0 } },
            { productId: 1, purchaseId: 1, remainingQuantity: 1, unitCost: 1, createdAt: 1 },
        ).lean<LotLean[]>(),
        ProductDistributorLinkModel.find({ productId: { $in: productIds } }).lean<ProductDistributorLinkDoc[]>(),
        getReferencesForProducts(productIds),
    ]);
    const links = await applyLocalCatalogPrices(linkDocs.map(mapProductDistributorLinkToDTO));

    const taxRates = new Map(products.map((p) => [p._id.toString(), p.taxRate ?? DEFAULT_TAX_RATE]));
    const purchaseTaxRates = await getPurchaseTaxRates(lotDocs);
    const lotsByProduct = new Map<string, RotationLot[]>();
    for (const lot of lotDocs) {
        const key = lot.productId.toString();
        // El IVA con el que se cargó la compra; si no está, el del producto
        const taxRate =
            (lot.purchaseId && purchaseTaxRates.get(`${lot.purchaseId.toString()}:${key}`)) ??
            taxRates.get(key) ??
            DEFAULT_TAX_RATE;
        lotsByProduct.set(key, [
            ...(lotsByProduct.get(key) ?? []),
            {
                receivedAt: new Date(lot.createdAt),
                remainingQuantity: lot.remainingQuantity,
                // Las compras se cargan sin IVA; los distribuidores, con IVA
                unitCost: lot.unitCost && lot.unitCost > 0 ? lot.unitCost * (1 + taxRate / 100) : null,
            },
        ]);
    }

    // Mejor costo con stock por producto
    const bestCost = new Map<string, { price: number; distributor: string }>();
    const linkedCount = new Map<string, number>();
    for (const link of links) {
        linkedCount.set(link.productId, (linkedCount.get(link.productId) ?? 0) + 1);
        if (!link.available || !link.lastPrice || link.lastPrice <= 0) continue;
        if (!hasDistributorStock(link.lastStock, link.lastStockLabel)) continue;
        const prev = bestCost.get(link.productId);
        if (!prev || link.lastPrice < prev.price) {
            bestCost.set(link.productId, { price: link.lastPrice, distributor: link.distributor });
        }
    }

    const rows: RotationRow[] = [];
    for (const product of products) {
        const productId = product._id.toString();
        const sold = sales.get(productId);
        const best = bestCost.get(productId) ?? null;
        const effectivePrice = Number(product.effectivePrice) || 0;
        const references = referencesByProduct.get(productId) ?? [];
        const { bestReferencePrice, referenceDiff } = compareWithReferences(effectivePrice, references);
        // La tienda de ese precio (con stock primero, igual que compareWithReferences)
        const referenceSource = bestReferencePrice
            ? ([...references]
                  .sort((a, b) => Number(b.inStock) - Number(a.inStock))
                  .find((r) => r.available && r.price === bestReferencePrice)?.sourceShortLabel ?? null)
            : null;
        const linkedDistributors = linkedCount.get(productId) ?? 0;
        const metrics = evaluateRotation(
            {
                availableStock: product.availableStock ?? 0,
                reservedStock: product.reservedStock ?? 0,
                productCreatedAt: product.createdAt ? new Date(product.createdAt) : null,
                unitsSold: sold?.units ?? 0,
                lastSaleAt: sold?.lastSaleAt ?? null,
                lots: lotsByProduct.get(productId) ?? [],
                replacementCost: best?.price ?? null,
                hasDistributorLinks: linkedDistributors > 0,
                referenceDiff,
                now,
            },
            settings,
        );
        if (metrics.reasons.length === 0) continue;

        rows.push({
            productId,
            name: product.name,
            sku: product.sku || "",
            image: product.image || null,
            effectivePrice,
            availableStock: Math.max(0, product.availableStock ?? 0),
            unitsSold: sold?.units ?? 0,
            lastSaleAt: sold ? new Date(sold.lastSaleAt).toISOString() : null,
            replacementCost: best?.price ?? null,
            replacementDistributor: best?.distributor ?? null,
            linkedDistributors,
            referencePrice: bestReferencePrice,
            referenceSource,
            referenceDiff,
            ...metrics,
        });
    }

    // Primero lo que más plata tiene parada
    rows.sort((a, b) => b.stockCost - a.stockCost || (b.oldestAgeDays ?? 0) - (a.oldestAgeDays ?? 0));

    const byReason: Record<RotationReason, number> = {
        slow: 0,
        old: 0,
        cheaper_replacement: 0,
        competitor_cheaper: 0,
        no_supplier: 0,
        restock: 0,
    };
    for (const row of rows) for (const r of row.reasons) byReason[r]++;
    const toRotate = rows.filter((r) => r.reasons.some((x) => x !== "restock"));

    return {
        settings,
        rows,
        summary: {
            toRotate: toRotate.length,
            stockCost: Math.round(toRotate.reduce((s, r) => s + r.stockCost, 0)),
            byReason,
        },
    };
}
