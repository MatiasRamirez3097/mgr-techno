import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { ProductModel } from "@/models/Product";
import { DISTRIBUTOR_LABELS } from "@/lib/distributors/productLinks";
import {
    buildPriceAlertDigest,
    selectNewlyBelowMin,
    selectSignificantChanges,
    type DigestCostChange,
} from "@/lib/priceAlertsDigest";
import { sendDiscordNotification } from "@/lib/notifications/discord/sendDiscordNotification";
import { getLocalCatalogPriceChanges } from "@/services/distributors/links/localCatalogItems";
import type { LinkPriceChange } from "@/services/distributors/links/refreshRemoteLinkPrices";
import type { DistributorKey } from "@/types/shared/distributorLink";
import { getPriceReview } from "./getPriceReview";

const STATE_ID = "price-alerts";
const DAY_MS = 24 * 60 * 60 * 1000;
// Productos bajo el mínimo que se comparan contra el aviso anterior
const MAX_TRACKED = 200;

interface AlertState {
    alertedProductIds?: string[];
    lastDigestAt?: Date | null;
}

export interface NotifyPriceAlertsResult {
    sent: boolean;
    newlyBelowMin: number;
    totalBelowMin: number;
    costChanges: number;
}

/**
 * Aviso diario a Discord: productos publicados que pasaron a estar bajo el margen mínimo
 * desde el aviso anterior y costos vinculados que variaron 5% o más (Elit/NewBytes, de la
 * actualización recién hecha; Invid/AIR, de su sincronización desde el último aviso).
 */
export async function notifyPriceAlerts(remoteChanges: LinkPriceChange[]): Promise<NotifyPriceAlertsResult> {
    await connectDB();
    const now = new Date();

    const state = await DistributorSyncStateModel.findById(STATE_ID, {
        alertedProductIds: 1,
        lastDigestAt: 1,
    }).lean<AlertState>();
    const since = state?.lastDigestAt ?? new Date(now.getTime() - DAY_MS);

    const review = await getPriceReview({ view: "below_min", status: "publish", limit: MAX_TRACKED });
    const newlyBelowMin = selectNewlyBelowMin(review.rows, state?.alertedProductIds ?? []);

    const costChanges = await collectCostChanges(remoteChanges, since);

    const digest = buildPriceAlertDigest({
        newlyBelowMin,
        totalBelowMin: review.total,
        costChanges,
        reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""}/admin/comparator/pricing?view=below_min`,
    });

    if (digest) {
        await sendDiscordNotification({ ...digest, color: newlyBelowMin.length > 0 ? 0xef4444 : 0xf59e0b });
    }

    // Se guarda el conjunto actual: si un producto se corrige y vuelve a caer, se avisa de nuevo
    await DistributorSyncStateModel.updateOne(
        { _id: STATE_ID },
        { $set: { alertedProductIds: review.rows.map((r) => r.productId), lastDigestAt: now } },
        { upsert: true },
    );

    return {
        sent: Boolean(digest),
        newlyBelowMin: newlyBelowMin.length,
        totalBelowMin: review.total,
        costChanges: costChanges.length,
    };
}

async function collectCostChanges(remoteChanges: LinkPriceChange[], since: Date): Promise<DigestCostChange[]> {
    const localLinks = await ProductDistributorLinkModel.find(
        { distributor: { $in: ["invid", "air"] } },
        { productId: 1, distributor: 1, distributorProductId: 1 },
    ).lean<{ productId: { toString(): string }; distributor: "invid" | "air"; distributorProductId: string }[]>();

    const localChanges = await getLocalCatalogPriceChanges(
        {
            invid: localLinks.filter((l) => l.distributor === "invid").map((l) => l.distributorProductId),
            air: localLinks.filter((l) => l.distributor === "air").map((l) => l.distributorProductId),
        },
        since,
    );

    // Un ítem de distribuidor puede estar vinculado a más de un producto propio
    const productsByItem = new Map<string, string[]>();
    for (const l of localLinks) {
        const key = `${l.distributor}:${l.distributorProductId}`;
        productsByItem.set(key, [...(productsByItem.get(key) ?? []), l.productId.toString()]);
    }

    const changes: { productId: string; distributor: DistributorKey; change: number }[] = [
        ...remoteChanges.map((c) => ({ productId: c.productId, distributor: c.distributor, change: c.change })),
        ...localChanges.flatMap((c) =>
            (productsByItem.get(`${c.distributor}:${c.distributorProductId}`) ?? []).map((productId) => ({
                productId,
                distributor: c.distributor,
                change: c.change,
            })),
        ),
    ];

    const significant = selectSignificantChanges(changes);
    if (significant.length === 0) return [];

    const products = await ProductModel.find(
        { _id: { $in: [...new Set(significant.map((c) => c.productId))] }, status: "publish" },
        { name: 1 },
    ).lean<{ _id: { toString(): string }; name: string }[]>();
    const names = new Map(products.map((p) => [p._id.toString(), p.name]));

    // Sólo productos publicados
    return significant.flatMap((c) => {
        const productName = names.get(c.productId);
        return productName ? [{ productName, distributor: DISTRIBUTOR_LABELS[c.distributor], change: c.change }] : [];
    });
}
