import { SaleItemSchema } from "@/models/SaleItem";

export function mapOrderToDocument({
    order,
    voucher,
}: {
    order: any;

    voucher: any;
}) {
    const isFiscal = voucher.type === "fiscal_invoice";

    const fiscalData = voucher.fiscalData || {};

    const customerName = [order.billing?.firstName, order.billing?.lastName]
        .filter(Boolean)
        .join(" ");
    console.log(order.items);
    return {
        /*
        |------------------------------------------------------------------
        | BUSINESS
        |------------------------------------------------------------------
        */

        business: {
            fantasyName: "MGR Techno",

            name: "RAMIREZ MATIAS GABRIEL",

            address: "Rosario, Santa Fe",

            phone: "3417223739",

            email: "ventas@mgrtechno.com.ar",

            cuit: process.env.AFIP_CUIT,

            ivaCondition: "Responsable Inscripto",
        },

        /*
        |------------------------------------------------------------------
        | DOCUMENT
        |------------------------------------------------------------------
        */

        document: {
            isFiscal,

            type: voucher.type,

            title: isFiscal
                ? `FACTURA ${fiscalData.fiscalType || ""}`
                : "COMPROBANTE",

            letter: isFiscal ? fiscalData.fiscalType : "X",

            fiscalType: fiscalData.fiscalType || null,

            number: fiscalData.fiscalNumber || voucher.number,

            date: new Date(
                voucher.generatedAt || order.createdAt,
            ).toLocaleDateString("es-AR"),

            qrData: fiscalData.qrData || {},

            cae: fiscalData.cae || null,

            caeExpiration: fiscalData.caeExpirationDate
                ? new Date(fiscalData.caeExpirationDate).toLocaleDateString(
                      "es-AR",
                  )
                : null,

            pointOfSale: fiscalData.fiscalPointOfSale || null,

            afipVoucherType: isFiscal
                ? getAfipVoucherCode(fiscalData.fiscalType)
                : "999",
        },

        /*
        |------------------------------------------------------------------
        | CUSTOMER
        |------------------------------------------------------------------
        */

        customer: {
            name: customerName || "Consumidor Final",

            email: order.customerEmail || "",

            phone: order.billing?.phone || "",

            address: order.billing?.address || "",

            document: order.billing?.document?.number || "",

            taxCondition: order.billing?.taxCondition || {
                label: "Consumidor Final",
            },
        },

        /*
        |------------------------------------------------------------------
        | ITEMS
        |------------------------------------------------------------------
        */

        items: order.items.map((item: any) => {
            // Buscamos los seriales asignados a este ítem en la orden
            const serials = item.allocations
                ?.filter((alloc: any) => alloc.inventoryItemId?.serialNumber) // Solo los que tienen serial
                .map((alloc: any) => alloc.inventoryItemId.serialNumber);

            // Armamos el nombre base
            let displayName = item.title || item.name;

            // Si hay seriales, los concatenamos
            if (serials && serials.length > 0) {
                displayName += ` (S/N: ${serials.join(", ")})`;
            }
            console.log(item.allocations);
            return {
                name: displayName,
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.subtotal,
            };
        }),

        /*
        |------------------------------------------------------------------
        | TOTALS
        |------------------------------------------------------------------
        */

        totals: {
            subtotal: order.subtotal || 0,

            shipping: order.shippingMethod?.cost || 0,

            iva: calculateIncludedIva(order.total),

            total: order.total || 0,
        },
    };
}

/*
|------------------------------------------------------------------
| HELPERS
|------------------------------------------------------------------
*/

function getAfipVoucherCode(fiscalType?: string) {
    switch (fiscalType) {
        case "A":
            return "001";

        case "B":
            return "006";

        case "C":
            return "011";

        case "M":
            return "051";

        default:
            return "999";
    }
}

function calculateIncludedIva(total: number) {
    const iva = total - total / 1.21;

    return Number(iva.toFixed(2));
}
