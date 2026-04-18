// /lib/mappers/orderMapper.ts
import type { OrderDTO } from "@/types/shared/order";

import type { OrderDB, OrderLineItemDB } from "@/types/backend/order";

export function mapOrderToDTO(order: OrderDB): OrderDTO {
    return {
        id: order._id.toString(),

        customerId: order.customerId ? order.customerId.toString() : null,

        customerEmail: order.customerEmail,

        status: order.status,

        billing: {
            firstName: order.billing?.firstName || "",
            lastName: order.billing?.lastName || "",
            address1: order.billing?.address1 || "",
            city: order.billing?.city || "",
            state: order.billing?.state || "",
            postcode: order.billing?.postcode || "",
            phone: order.billing?.phone || "",
            country: order.billing?.country || "AR",
            tipoDocumento: order.billing?.tipoDocumento || "",
            numeroDocumento: order.billing?.numeroDocumento || "",
        },

        shipping: {
            firstName: order.shipping?.firstName || "",
            lastName: order.shipping?.lastName || "",
            address1: order.shipping?.address1 || "",
            city: order.shipping?.city || "",
            state: order.shipping?.state || "",
            postcode: order.shipping?.postcode || "",
            country: order.shipping?.country || "AR",
        },

        lineItems:
            order.lineItems.map((item: OrderLineItemDB) => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
            })) || [],

        paymentMethod: order.paymentMethod,
        paymentMethodTitle: order.paymentMethodTitle || "",

        shippingMethod: order.shippingMethod,
        shippingCost: order.shippingCost || 0,

        subtotal: order.subtotal,
        total: order.total,

        datePaid: order.datePaid ? order.datePaid.toISOString() : null,

        notes: order.notes || "",

        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
    };
}
