export function mapOrderToDocumentData({
    order,
    invoice,
}: {
    order: any;

    invoice?: any;
}) {
    return {
        business: {
            name: "MGR Techno",

            address: "Rosario, Santa Fe",

            phone: "3417223739",

            email: "ventas@mgrtechno.com.ar",
        },

        document: {
            type: invoice ? "FACTURA B" : "COMPROBANTE",

            number: invoice
                ? `${invoice.pointOfSale
                      .toString()
                      .padStart(4, "0")}-${invoice.voucherNumber
                      .toString()
                      .padStart(8, "0")}`
                : order._id.toString().slice(-6).toUpperCase(),

            date: new Date(
                invoice?.createdAt || order.createdAt,
            ).toLocaleDateString("es-AR"),
        },

        customer: {
            name:
                invoice?.customerSnapshot?.name ||
                `${order.billing?.firstName || ""} ${
                    order.billing?.lastName || ""
                }`,

            email: order.customerEmail,

            phone: order.billing?.phone,

            address:
                invoice?.customerSnapshot?.address || order.billing?.address,

            document: invoice?.customerSnapshot?.documentNumber,
        },

        items: (invoice?.itemsSnapshot || order.items).map((item: any) => ({
            name: item.title || item.name,

            quantity: item.quantity,

            price: item.unitPrice,

            total: item.total,
        })),

        totals: invoice?.totalsSnapshot || {
            subtotal: order.subtotal,

            shipping: order.shippingMethod?.cost || 0,

            total: order.total,
        },

        afip: invoice
            ? {
                  cae: invoice.cae,

                  caeExpiration: invoice.caeExpiration,

                  qrUrl: invoice.qrUrl,
              }
            : null,
    };
}
