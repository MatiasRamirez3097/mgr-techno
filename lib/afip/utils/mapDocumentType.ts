import { AFIP_DOCUMENT_TYPES } from "../constants";

type BillingDocument = {
    documentType?: string | null;
    number?: string | number | null;
};

/**
 * Convierte el documento del cliente (Order.billing.document) al par
 * DocTipo/DocNro de AFIP. Se usa en la factura (WSFE) y en el QR, que
 * deben coincidir. Sin número válido → Consumidor Final (99) con DocNro 0.
 */
export function getAfipDocument(document?: BillingDocument | null): {
    type: number;
    number: number;
} {
    const number = Number(String(document?.number ?? "").replace(/\D/g, ""));

    if (!number) {
        return { type: AFIP_DOCUMENT_TYPES.CONSUMIDOR_FINAL, number: 0 };
    }

    switch (document?.documentType?.trim().toUpperCase()) {
        case "CUIT":
            return { type: AFIP_DOCUMENT_TYPES.CUIT, number };
        case "CUIL":
            return { type: AFIP_DOCUMENT_TYPES.CUIL, number };
        case "DNI":
            return { type: AFIP_DOCUMENT_TYPES.DNI, number };
        default:
            return { type: AFIP_DOCUMENT_TYPES.CONSUMIDOR_FINAL, number: 0 };
    }
}
