import { sendDiscordNotification } from "@/lib/notifications/discord/sendDiscordNotification";
import { getPendingSales } from "./getPendingSales";

const MAX_LINES = 15;
const INBOX_URL = "https://mgrtechno.com.ar/admin/pending-sales";

/** Aviso a Discord con las ventas escaneadas que siguen sin pedido. No avisa si no hay. */
export async function notifyPendingSales() {
    const pending = await getPendingSales("pending", 500);
    if (pending.length === 0) return { notified: false, count: 0 };

    const lines = pending
        .slice(0, MAX_LINES)
        .map((s) => `• ${s.quantity} × ${s.productName}${s.createdBy ? ` (${s.createdBy})` : ""}`);
    if (pending.length > MAX_LINES) lines.push(`… y ${pending.length - MAX_LINES} más`);

    await sendDiscordNotification({
        title: `📦 ${pending.length} ${pending.length === 1 ? "venta escaneada" : "ventas escaneadas"} sin formalizar`,
        color: 0xfee75c,
        description: `${lines.join("\n")}\n\n[Formalizarlas en el panel](${INBOX_URL})`,
    });

    return { notified: true, count: pending.length };
}
