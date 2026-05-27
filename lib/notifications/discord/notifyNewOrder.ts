// lib/notifications/discord/notifyNewOrder.ts

import { sendDiscordNotification } from "./sendDiscordNotification";

export async function notifyNewOrder(order: any) {
    const orderNumber = order._id.toString().slice(-6).toUpperCase();

    return sendDiscordNotification({
        title: "🛒 Nueva venta",
        color: 0x57f287,

        description: `
**Orden:** #${orderNumber}

**Cliente:** ${order.billing.firstName} ${order.billing.lastName}
**Provincia:** ${order.billing.state}
**Ciudad:** ${order.billing.city}
**Email:** ${order.customerEmail}

**Total:** $${order.total.toLocaleString("es-AR")}

**Productos**
${order.items.map((i: any) => `• ${i.name} x${i.quantity}`).join("\n")}
`,
    });
}
