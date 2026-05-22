import { buildIvaBreakdown } from "./buildIvaBreakdown";

import { AFIP_IVA_IDS } from "../constants";

interface Params {
    order: any;

    voucherNumber: number;

    pointOfSale: number;

    voucherType: number;
}

export function buildInvoiceRequest({
    order,
    voucherNumber,
    pointOfSale,
    voucherType,
}: Params) {
    const items = order.items.map((item: any) => {
        const quantity = item.quantity;

        /*
        |--------------------------------------------------------------------------
        | PRECIO FINAL (IVA INCLUIDO)
        |--------------------------------------------------------------------------
        */

        const unitPrice = item.unitPrice ?? item.price;

        const taxRate = item.taxRate ?? 21;

        /*
        |--------------------------------------------------------------------------
        | TOTAL FINAL
        |--------------------------------------------------------------------------
        */

        const total = Number((quantity * unitPrice).toFixed(2));

        /*
        |--------------------------------------------------------------------------
        | DESGLOSE IVA
        |--------------------------------------------------------------------------
        */

        const divisor = 1 + taxRate / 100;

        const netSubtotal = Number((total / divisor).toFixed(2));

        const ivaAmount = Number((total - netSubtotal).toFixed(2));

        return {
            ...item,

            quantity,

            taxRate,

            unitPrice,

            total,

            netSubtotal,

            ivaAmount,
        };
    });

    /*
    |--------------------------------------------------------------------------
    | IVA BREAKDOWN
    |--------------------------------------------------------------------------
    */

    const ivaBreakdown = buildIvaBreakdown(items);

    /*
    |--------------------------------------------------------------------------
    | TOTALS
    |--------------------------------------------------------------------------
    */

    const impNeto = Number(
        ivaBreakdown
            .reduce((acc: number, item: any) => acc + item.net, 0)
            .toFixed(2),
    );

    const impIVA = Number(
        ivaBreakdown
            .reduce((acc: number, item: any) => acc + item.iva, 0)
            .toFixed(2),
    );

    const impTotal = Number((impNeto + impIVA).toFixed(2));

    /*
    |--------------------------------------------------------------------------
    | IVA LINES
    |--------------------------------------------------------------------------
    */

    const ivaLines = ivaBreakdown.map((item: any) => ({
        Id: AFIP_IVA_IDS[item.rate],

        BaseImp: item.net,

        Importe: item.iva,
    }));

    /*
    |--------------------------------------------------------------------------
    | DATE
    |--------------------------------------------------------------------------
    */

    const today = new Date();

    const cbteFch = today.toISOString().slice(0, 10).replaceAll("-", "");

    /*
    |--------------------------------------------------------------------------
    | AFIP REQUEST
    |--------------------------------------------------------------------------
    */

    return {
        FeCAEReq: {
            FeCabReq: {
                CantReg: 1,

                PtoVta: pointOfSale,

                CbteTipo: voucherType,
            },

            FeDetReq: {
                FECAEDetRequest: [
                    {
                        Concepto: 1,

                        DocTipo:
                            order.billing?.document?.documentType.toLowerCase() ===
                            "dni"
                                ? 96
                                : 99,

                        DocNro: Number(order.billing?.document?.number || 0),

                        CbteDesde: voucherNumber,

                        CbteHasta: voucherNumber,

                        CbteFch: Number(cbteFch),

                        ImpTotal: impTotal,

                        ImpTotConc: 0,

                        ImpNeto: impNeto,

                        ImpOpEx: 0,

                        ImpIVA: impIVA,

                        ImpTrib: 0,

                        MonId: "PES",

                        MonCotiz: 1,

                        Iva: {
                            AlicIva: ivaLines,
                        },
                    },
                ],
            },
        },
    };
}
