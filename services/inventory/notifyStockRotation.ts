import { sendDiscordNotification } from "@/lib/notifications/discord/sendDiscordNotification";
import { buildRotationDigest } from "@/lib/inventory/rotationDigest";
import { getRotationSettings } from "@/services/settings/getRotationSettings";
import { getRotationReport } from "./getRotationReport";

/** Resumen semanal de "Stock a rotar" a Discord. No hace nada si está apagado o no hay productos. */
export async function notifyStockRotation() {
    const settings = await getRotationSettings();
    if (!settings.rotationNotifyEnabled) return { notified: false, reason: "disabled" as const };

    const report = await getRotationReport();
    const digest = buildRotationDigest(report);
    if (!digest) return { notified: false, reason: "empty" as const };

    await sendDiscordNotification({ ...digest, color: 0xf0883e });
    return { notified: true, toRotate: report.summary.toRotate, restock: report.summary.byReason.restock };
}
