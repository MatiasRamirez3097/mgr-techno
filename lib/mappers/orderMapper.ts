// /lib/mappers/orderMapper.ts
import type { OrderDTO } from "@/types/shared/order";

import type { OrderDB, OrderItemDB } from "@/types/backend/order";

export function mapOrderToDTO(order: OrderDB): OrderDTO {
    return {
        id: order._id.toString(),

        customerId: order.customerId ? order.customerId.toString() : null,

        customerEmail: order.customerEmail,

        status: order.status,

        billing: {
            firstName: order.billing?.firstName || "",
            lastName: order.billing?.lastName || "",
            address: order.billing?.address || "",
            city: order.billing?.city || "",
            state: order.billing?.state || "",
            postcode: order.billing?.postcode || "",
            phone: order.billing?.phone || "",
            country: order.billing?.country || "AR",
            document: {
                documentType: order.billing?.document?.documentType || "",
                number: order.billing?.document?.number || "",
            },
        },

        shipping: {
            firstName: order.shipping?.firstName || "",
            lastName: order.shipping?.lastName || "",
            address: order.shipping?.address || "",
            city: order.shipping?.city || "",
            state: order.shipping?.state || "",
            postcode: order.shipping?.postcode || "",
            country: order.shipping?.country || "AR",
        },

        items:
            order.items.map((item) => ({
                productId: item.productId.toString(),
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })) || [],

        payments:
            order.payments.map((p) => ({
                id: p._id.toString(),
                method: p.method,
                status: p.status,
                amount: p.amount,
                paidAt: p.paidAt ? p.paidAt.toISOString() : "",
            })) || [],
        paymentStatus: order.paymentStatus || "",
        shippingMethod: order.shippingMethod,

        subtotal: order.subtotal,
        total: order.total,

        datePaid: order.datePaid ? order.datePaid.toISOString() : null,

        notes: order.notes || "",
        vouchers:
            order.vouchers?.map((p) => ({
                id: p._id.toString(),
                type: p.type,
                number: p.number,
                generatedAt: p.generatedAt.toISOString(),
                url: p.url || "",
                publicId: p.publicId || "",
            })) || [],
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        inventoryAllocatedAt: order.inventoryAllocatedAt?.toISOString() || null,
    };
}
