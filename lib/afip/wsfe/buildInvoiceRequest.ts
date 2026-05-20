// /lib/afip/wsfe/buildInvoiceRequest.ts

import { AFIP_DOCUMENT_TYPES } from "../constants";

interface InvoiceItem {
    title: string;

    quantity: number;

    unitPrice: number;
}

interface InvoiceCustomer {
    documentType: number;

    documentNumber: string;

    taxCondition: {
        id: number;

        label: string;
    };
}

interface BuildInvoiceRequestParams {
    invoiceNumber: number;

    pointOfSale: number;

    voucherType: number;

    customer: InvoiceCustomer;

    items: InvoiceItem[];
}

export function buildInvoiceRequest({
    invoiceNumber,
    pointOfSale,
    voucherType,
    customer,
    items,
}: BuildInvoiceRequestParams) {
    // =========================
    // Totales
    // =========================

    const net = Number(
        items
            .reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
            .toFixed(2),
    );

    // 21% IVA
    const ivaAmount = Number((net * 0.21).toFixed(2));

    const total = Number((net + ivaAmount).toFixed(2));

    // =========================
    // Fecha comprobante
    // =========================

    const today = new Date();

    const cbteFch = `${today.getFullYear()}${String(
        today.getMonth() + 1,
    ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    // =========================
    // Documento receptor
    // =========================

    let docType = customer.documentType;

    let docNumber = Number(customer.documentNumber);

    // Consumidor Final
    if (!customer.documentNumber) {
        docType = AFIP_DOCUMENT_TYPES.CONSUMIDOR_FINAL;

        docNumber = 0;
    }

    // =========================
    // Request WSFE
    // =========================

    return {
        FeCabReq: {
            CantReg: 1,

            PtoVta: pointOfSale,

            CbteTipo: voucherType,
        },

        FeDetReq: {
            FECAEDetRequest: {
                Concepto: 1,

                DocTipo: docType,

                DocNro: docNumber,

                CbteDesde: invoiceNumber,

                CbteHasta: invoiceNumber,

                CbteFch: cbteFch,

                ImpTotal: total,

                ImpTotConc: 0,

                ImpNeto: net,

                ImpOpEx: 0,

                ImpIVA: ivaAmount,

                ImpTrib: 0,

                MonId: "PES",

                MonCotiz: 1,

                CondicionIVAReceptorId: customer.taxCondition.id,

                Iva: {
                    AlicIva: {
                        Id: 5,

                        BaseImp: net,

                        Importe: ivaAmount,
                    },
                },
            },
        },
    };
}
