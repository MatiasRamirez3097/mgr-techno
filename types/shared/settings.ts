export interface StoreSettingsDTO {
    mercadoPagoSurchargePercent: number;
}

// Configuración de la revisión de precios (sólo admin)
export interface PricingSettingsDTO {
    targetMarginPercent: number;
    minMarginPercent: number;
    priceRoundingStep: number;
}
