"use client";

import { createContext, useContext } from "react";
import { DEFAULT_MP_SURCHARGE_PERCENT } from "@/lib/pricing";
import type { StoreSettingsDTO } from "@/types/shared/settings";

const StoreSettingsContext = createContext<StoreSettingsDTO>({
    mercadoPagoSurchargePercent: DEFAULT_MP_SURCHARGE_PERCENT,
});

export function StoreSettingsProvider({
    settings,
    children,
}: {
    settings: StoreSettingsDTO;
    children: React.ReactNode;
}) {
    return (
        <StoreSettingsContext.Provider value={settings}>
            {children}
        </StoreSettingsContext.Provider>
    );
}

export function useStoreSettings() {
    return useContext(StoreSettingsContext);
}
