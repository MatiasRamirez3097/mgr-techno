"use client";

import { createContext, useContext, useMemo } from "react";
import type { ActiveDailyDeal } from "@/types/shared/dailyDeals";

interface DailyDealContextValue {
    endsAt: string | null;
    productIds: Set<string>;
}

const DailyDealContext = createContext<DailyDealContextValue>({ endsAt: null, productIds: new Set() });

export function DailyDealProvider({ deal, children }: { deal: ActiveDailyDeal | null; children: React.ReactNode }) {
    const value = useMemo(
        () => ({ endsAt: deal?.endsAt ?? null, productIds: new Set(deal?.productIds ?? []) }),
        [deal],
    );
    return <DailyDealContext.Provider value={value}>{children}</DailyDealContext.Provider>;
}

export function useDailyDeal() {
    return useContext(DailyDealContext);
}

/** Hora de fin de la oferta del día si el producto participa; null si no. */
export function useDailyDealEndsAt(productId: string) {
    const { endsAt, productIds } = useDailyDeal();
    return endsAt && productIds.has(productId) ? endsAt : null;
}
