export function mapOrderToSaleReceipt(order: any) {
    return {
        business: {
            name: "MGR Techno",
            address: "Rosario, Santa Fe",
            phone: "3417223739",
            email: "ventas@mgrtechno.com.ar",
        },

        customer: {
            name:
                `${order.billing?.firstName || ""} ` +
                `${order.billing?.lastName || ""}`,

            email: order.customerEmail,

            phone: order.billing?.phone,
        },

        order: {
            number: order._id.toString().slice(-6).toUpperCase(),

            date: new Date(order.createdAt).toLocaleDateString("es-AR"),
        },

        items: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.total,
        })),

        totals: {
            subtotal: order.subtotal,
            shipping: order.shippingMethod?.cost || 0,
            total: order.total,
        },
    };
}
