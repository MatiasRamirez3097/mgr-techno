interface Params {
    pointOfSale: number;

    voucherType: number;

    voucherNumber: number;

    customer: any;

    totals: {
        subtotal: number;
        iva: number;
        total: number;
    };
}

export function buildInvoiceRequest({
    pointOfSale,
    voucherType,
    voucherNumber,
    customer,
    totals,
}: Params) {
    return {
        FeCabReq: {
            CantReg: 1,

            PtoVta: pointOfSale,

            CbteTipo: voucherType,
        },

        FeDetReq: {
            FECAEDetRequest: {
                Concepto: 1,

                DocTipo: customer.documentType,

                DocNro: Number(customer.documentNumber),

                CbteDesde: voucherNumber,

                CbteHasta: voucherNumber,

                CbteFch: Number(
                    new Date().toISOString().slice(0, 10).replace(/-/g, ""),
                ),

                ImpTotal: totals.total,

                ImpTotConc: 0,

                ImpNeto: totals.subtotal,

                ImpOpEx: 0,

                ImpIVA: totals.iva,

                ImpTrib: 0,

                MonId: "PES",

                MonCotiz: 1,

                Iva: {
                    AlicIva: [
                        {
                            Id: 5,

                            BaseImp: totals.subtotal,

                            Importe: totals.iva,
                        },
                    ],
                },
            },
        },
    };
}
