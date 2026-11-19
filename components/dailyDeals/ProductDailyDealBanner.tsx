"use client";

import Link from "next/link";
import { useDailyDealEndsAt } from "@/components/providers/DailyDealProvider";
import { DealCountdown } from "./DealCountdown";
import { discountPercentOf } from "@/lib/dailyDeals/discount";

/** Aviso con cuenta regresiva en la página del producto, si está en la oferta del día. */
export function ProductDailyDealBanner({
    productId,
    regularPrice,
    salePrice,
}: {
    productId: string;
    regularPrice: number;
    salePrice?: number | null;
}) {
    const endsAt = useDailyDealEndsAt(productId);
    if (!endsAt) return null;
    const discount = discountPercentOf(regularPrice, salePrice);

    return (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand/50 bg-brand/10 p-4">
            <div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/ofertas-del-dia"
                        className="text-sm font-black uppercase tracking-wider text-brand hover:underline"
                    >
                        ⚡ Oferta del día
                    </Link>
                    {discount > 0 && (
                        <span className="rounded bg-brand px-2 py-0.5 text-xs font-black text-white">-{discount}% OFF</span>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Este precio vale sólo hasta la medianoche.</p>
            </div>
            <DealCountdown endsAt={endsAt} variant="large" />
        </div>
    );
}
