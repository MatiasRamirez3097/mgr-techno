export interface StoreSettingsDTO {
    mercadoPagoSurchargePercent: number;
}

// Configuración de distribuidores (sólo admin)
export interface DistributorSettingsDTO {
    // Sumar al precio de PCMODD el IVA de la columna C de su hoja
    pcmoddApplyIva: boolean;
}

// Configuración de la revisión de precios (sólo admin)
export interface PricingSettingsDTO {
    targetMarginPercent: number;
    minMarginPercent: number;
    priceRoundingStep: number;
}
