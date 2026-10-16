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

    const calculateTotalIva = (items: any[]) => {
        return items.reduce((acc, item) => {
            // Asumimos que item.taxRate es un decimal, ej: 0.21 para el 21%
            // Si viene como entero (21), usa: (item.taxRate / 100)
            const rate = item.taxRate / 100 || 0;

            // Calculamos el IVA del subtotal de este ítem
            // Si el precio del item ya incluye IVA: (Total / (1 + tasa)) * tasa
            // Si el precio es neto: Total * tasa
            const itemIva = (item.subtotal / (1 + rate)) * rate;

            return acc + itemIva;
        }, 0);
    };

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

            taxCondition:
                order.billing?.document?.documentType?.toLowerCase() === "cuit"
                    ? { label: "Responsable Inscripto" }
                    : {
                          label: "Consumidor Final",
                      },
        },

        /*
        |------------------------------------------------------------------
        | ITEMS
        |------------------------------------------------------------------
        */

        items: order.items.map((item: any) => {
            const displayName = item.title || item.name;

            // Si es un combo con desglose de componentes, listamos cada componente con sus seriales (sin precios individuales)
            if (
                item.isBundle &&
                Array.isArray(item.bundleComponents) &&
                item.bundleComponents.length > 0
            ) {
                const subItems = item.bundleComponents.map((comp: any) => {
                    const compIdStr = comp.productId?.toString();
                    const compSerials = (item.allocations || [])
                        .filter((alloc: any) => {
                            const allocCompId =
                                alloc.componentProductId?.toString() ||
                                alloc.inventoryItemId?.productId?.toString();
                            return (
                                allocCompId === compIdStr &&
                                alloc.inventoryItemId?.serialNumber
                            );
                        })
                        .map((alloc: any) => alloc.inventoryItemId.serialNumber);

                    const totalCompQty =
                        Number(comp.totalQuantity) ||
                        Number(item.quantity) *
                            Math.max(1, Number(comp.quantityPerBundle) || 1);

                    let line = `${totalCompQty}x ${comp.name}`;
                    if (compSerials.length > 0) {
                        line += ` (S/N: ${compSerials.join(", ")})`;
                    }
                    return line;
                });

                return {
                    name: displayName,
                    subItems,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.subtotal,
                };
            }

            // Producto simple: buscamos los seriales asignados a este ítem en la orden
            const serials = item.allocations
                ?.filter((alloc: any) => alloc.inventoryItemId?.serialNumber)
                .map((alloc: any) => alloc.inventoryItemId.serialNumber);

            let simpleDisplayName = displayName;
            if (serials && serials.length > 0) {
                simpleDisplayName += ` (S/N: ${serials.join(", ")})`;
            }

            return {
                name: simpleDisplayName,
                subItems: [],
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

            iva: Number(calculateTotalIva(order.items).toFixed(2)),

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
