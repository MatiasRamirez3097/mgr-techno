// /lib/afip/constants.ts

export const AFIP_VOUCHER_TYPES = {
    FA: 1,
    FB: 6,
    FC: 11,
} as const;

export type AfipVoucherType = keyof typeof AFIP_VOUCHER_TYPES;

export const AFIP_IVA = {
    IVA_21: 5,
};

export const AFIP_CURRENCY = {
    PES: "PES",
};

export const AFIP_CONCEPTS = {
    PRODUCTS: 1,
};

export const AFIP_INVOICE_TYPES = {
    FACTURA_A: 1,

    NOTA_CREDITO_A: 3,

    FACTURA_B: 6,

    NOTA_CREDITO_B: 8,
} as const;

export const AFIP_DOCUMENT_TYPES = {
    CUIT: 80,

    DNI: 96,

    CONSUMIDOR_FINAL: 99,
} as const;

export const AFIP_TAX_CONDITIONS = {
    RESPONSABLE_INSCRIPTO: 1,

    EXENTO: 4,

    CONSUMIDOR_FINAL: 5,

    MONOTRIBUTISTA: 6,
} as const;
