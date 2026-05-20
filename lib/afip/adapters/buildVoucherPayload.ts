import { AFIP_CONCEPTS, AFIP_CURRENCY, AFIP_IVA } from "../constants";

interface Params {
    invoice: any;

    voucherNumber: number;

    pointOfSale: number;

    voucherType: number;
}

export function buildVoucherPayload({
    invoice,
    voucherNumber,
    pointOfSale,
    voucherType,
}: Params) {
    const today = new Date();

    const date = today.toISOString().slice(0, 10).replaceAll("-", "");

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
                        Concepto: AFIP_CONCEPTS.PRODUCTS,

                        DocTipo: invoice.customer.documentType,

                        DocNro: Number(invoice.customer.documentNumber),

                        CbteDesde: voucherNumber,
                        CbteHasta: voucherNumber,

                        CbteFch: Number(date),

                        ImpTotal: invoice.total,

                        ImpTotConc: 0,

                        ImpNeto: invoice.subtotal,

                        ImpOpEx: 0,

                        ImpIVA: invoice.taxes,

                        ImpTrib: 0,

                        MonId: AFIP_CURRENCY.PES,

                        MonCotiz: 1,

                        Iva: [
                            {
                                Id: AFIP_IVA.IVA_21,

                                BaseImp: invoice.subtotal,

                                Importe: invoice.taxes,
                            },
                        ],
                    },
                ],
            },
        },
    };
}
