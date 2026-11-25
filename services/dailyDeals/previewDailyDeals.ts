import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { CategoryModel } from "@/models/Category";
import { DailyDealModel } from "@/models/DailyDeal";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import { applyLocalCatalogPrices } from "@/services/distributors/links/applyLocalCatalogPrices";
import { getPricingSettings } from "@/services/settings/getPricingSettings";
import { getRotationReport } from "@/services/inventory/getRotationReport";
import { hasDistributorStock } from "@/lib/distributors/productLinks";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import {
    mapProductDistributorLinkToDTO,
    type ProductDistributorLinkDoc,
} from "@/lib/mappers/productDistributorLinkMapper";
import {
    ALL_PRODUCTS_GROUP,
    evaluateDealProduct,
    evaluateRotationDealProduct,
    expandCategoryIds,
    selectDailyDeals,
    type DealCandidate,
    type DealCostOption,
} from "@/lib/dailyDeals/selection";
import type {
    DailyDealExclusionReason,
    DailyDealPreviewItem,
    DailyDealPreviewResult,
    DailyDealSettingsDTO,
} from "@/types/shared/dailyDeals";
import type { DistributorKey } from "@/types/shared/distributorLink";

interface ProductLean {
    _id: Types.ObjectId;
    name: string;
    sku?: string;
    slug: string;
    image?: string;
    regularPrice: number;
    salePrice?: number | null;
    categories?: Types.ObjectId[];
    brand?: Types.ObjectId | null;
}

interface CandidateInfo extends DealCandidate {
    product: ProductLean;
    cost: number;
    costDistributor: DistributorKey | null;
    costWithoutStock: boolean;
    rotationPricing: boolean;
    dealPrice: number;
    discountPercent: number;
    marginPercent: number;
    dealMarginPercent: number;
}

// El historial que se mira para no repetir (más que el máximo configurable de días)
const HISTORY_DAYS = 90;

/** Última fecha en que salió cada producto, dentro del historial */
async function getLastFeaturedDates(today: string): Promise<Map<string, string>> {
    const since = new Date(Date.parse(`${today}T00:00:00Z`) - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
    const deals = await DailyDealModel.find(
        { date: { $gte: since, $lt: today }, status: { $ne: "cancelled" } },
        { date: 1, "items.productId": 1 },
    ).lean<{ date: string; items: { productId: Types.ObjectId }[] }[]>();
    const last = new Map<string, string>();
    for (const deal of deals) {
        for (const item of deal.items) {
            const id = item.productId.toString();
            if (!last.has(id) || last.get(id)! < deal.date) last.set(id, deal.date);
        }
    }
    return last;
}

/**
 * Simula el sorteo de las ofertas del día con la configuración dada (guardada o no): qué
 * productos saldrían, a qué precio y con qué utilidad, y cuántos quedan afuera y por qué.
 * No cambia precios ni guarda nada.
 */
export async function previewDailyDeals(
    settings: DailyDealSettingsDTO,
    {
        now = new Date(),
        random = Math.random,
        excludeProductIds = [],
    }: { now?: Date; random?: () => number; excludeProductIds?: string[] } = {},
): Promise<DailyDealPreviewResult> {
    await connectDB();
    const today = todayInStoreTimeZone(now);

    // Sólo lo que se ve y se puede comprar en la tienda; sin combos, outlet ni la "PC armada"
    const [pricing, categoryDocs, products, lastFeatured] = await Promise.all([
        getPricingSettings(),
        CategoryModel.find({}, { parentId: 1 }).lean<{ _id: Types.ObjectId; parentId?: Types.ObjectId | null }[]>(),
        ProductModel.find(
            {
                status: "publish",
                isAvailable: true,
                type: { $ne: "bundle" },
                isOutlet: { $ne: true },
                slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
                regularPrice: { $gt: 0 },
            },
            { name: 1, sku: 1, slug: 1, image: 1, regularPrice: 1, salePrice: 1, categories: 1, brand: 1 },
        ).lean<ProductLean[]>(),
        getLastFeaturedDates(today),
    ]);

    // Productos con algún motivo para sacar ("reponer" no cuenta: esos se venden solos)
    // Sólo se calcula si se usa: priorizar, descuentos propios o algún grupo de "sólo stock a rotar".
    // Para cada uno, lo que se pagó por unidad (con IVA), que es la base de sus descuentos propios.
    const usesRotation =
        settings.prioritizeRotation || settings.rotationOwnDiscounts || settings.groups.some((g) => g.onlyRotation);
    const rotationCosts = new Map<string, number | null>(
        usesRotation
            ? (await getRotationReport(now)).rows
                  .filter((r) => r.reasons.some((reason) => reason !== "restock"))
                  .map((r) => [r.productId, r.averageUnitCost])
            : [],
    );

    const linkDocs = await ProductDistributorLinkModel.find({
        productId: { $in: products.map((p) => p._id) },
    }).lean<ProductDistributorLinkDoc[]>();
    const links = await applyLocalCatalogPrices(linkDocs.map(mapProductDistributorLinkToDTO));
    const costsByProduct = new Map<string, DealCostOption[]>();
    for (const link of links) {
        costsByProduct.set(link.productId, [
            ...(costsByProduct.get(link.productId) ?? []),
            {
                distributor: link.distributor,
                price: link.lastPrice,
                inStock: hasDistributorStock(link.lastStock, link.lastStockLabel),
                available: link.available,
            },
        ]);
    }

    const excluded: Record<DailyDealExclusionReason, number> = {
        on_sale: 0,
        no_cost: 0,
        no_stock: 0,
        low_margin: 0,
        no_deal_price: 0,
    };
    const candidates: CandidateInfo[] = [];
    // Al regenerar, no vuelven a salir los productos de la tanda que se acaba de cancelar
    const skip = new Set(excludeProductIds);
    for (const product of products) {
        const productId = product._id.toString();
        if (skip.has(productId)) continue;
        const input = {
            regularPrice: product.regularPrice,
            salePrice: product.salePrice,
            costs: costsByProduct.get(productId) ?? [],
        };
        const rotation = rotationCosts.has(productId);
        const rotationPricing = rotation && settings.rotationOwnDiscounts;
        const evaluation = rotationPricing
            ? evaluateRotationDealProduct(
                  { ...input, stockUnitCost: rotationCosts.get(productId) ?? null },
                  settings,
                  pricing.priceRoundingStep,
              )
            : evaluateDealProduct(input, settings, pricing.priceRoundingStep);
        if (!evaluation.eligible) {
            excluded[evaluation.reason]++;
            continue;
        }
        candidates.push({
            productId,
            categoryIds: (product.categories ?? []).map((c) => c.toString()),
            brandId: product.brand ? product.brand.toString() : null,
            distributors: evaluation.cost.distributors,
            lastFeaturedOn: lastFeatured.get(productId) ?? null,
            rotation,
            priority: settings.prioritizeRotation && rotation,
            rotationPricing,
            product,
            cost: evaluation.cost.cost,
            costDistributor: evaluation.cost.distributor,
            costWithoutStock: !evaluation.cost.inStock,
            dealPrice: evaluation.dealPrice,
            discountPercent: evaluation.discountPercent,
            marginPercent: evaluation.marginPercent,
            dealMarginPercent: evaluation.dealMarginPercent,
        });
    }

    const tree = categoryDocs.map((c) => ({ id: c._id.toString(), parentId: c.parentId ? c.parentId.toString() : null }));
    const groups = settings.groups.map((g) => ({ ...g, categoryIds: expandCategoryIds(g.categoryIds, tree) }));
    const { picks, groups: groupStats } = selectDailyDeals({
        candidates,
        groups,
        count: settings.productCount,
        noRepeatDays: settings.noRepeatDays,
        today,
        random,
    });

    const byId = new Map(candidates.map((c) => [c.productId, c]));
    const groupNames = new Map([...settings.groups, ALL_PRODUCTS_GROUP].map((g) => [g.id, g.name]));
    const items: DailyDealPreviewItem[] = picks.map((pick) => {
        const c = byId.get(pick.productId)!;
        return {
            productId: c.productId,
            name: c.product.name,
            sku: c.product.sku || "",
            slug: c.product.slug,
            image: c.product.image || null,
            groupId: pick.groupId,
            groupName: groupNames.get(pick.groupId) ?? pick.groupId,
            regularPrice: c.product.regularPrice,
            dealPrice: c.dealPrice,
            cost: c.cost,
            costDistributor: c.costDistributor,
            costWithoutStock: c.costWithoutStock,
            discountPercent: c.discountPercent,
            marginPercent: c.marginPercent,
            dealMarginPercent: c.dealMarginPercent,
            repeated: pick.repeated,
            lastFeaturedOn: c.lastFeaturedOn,
            rotation: Boolean(c.rotation),
            rotationPricing: c.rotationPricing,
        };
    });

    return {
        date: today,
        items,
        groups: groupStats,
        evaluated: products.length,
        eligible: candidates.length,
        excluded,
        shortfall: Math.max(0, settings.productCount - items.length),
    };
}
