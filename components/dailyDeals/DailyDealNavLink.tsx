"use client";

import Link from "next/link";
import { useDailyDeal } from "@/components/providers/DailyDealProvider";
import { useCountdown } from "./useCountdown";

/** Acceso a las ofertas del día desde la barra superior, con el tiempo que falta. */
export function DailyDealNavLink() {
    const { endsAt, productIds } = useDailyDeal();
    const parts = useCountdown(endsAt);
    if (!endsAt || productIds.size === 0 || parts?.finished) return null;

    const time = parts ? `${parts.hours}:${parts.minutes}:${parts.seconds}` : "--:--:--";
    return (
        <Link
            href="/ofertas-del-dia"
            className="inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-brand/20 shrink-0"
            title="Ver las ofertas del día"
        >
            <span aria-hidden>⚡</span>
            <span className="hidden sm:inline">Ofertas del día</span>
            <span className="tabular-nums font-semibold bg-black/25 rounded-md px-1.5 py-0.5" role="timer" aria-label="Tiempo restante de las ofertas del día">
                {time}
            </span>
        </Link>
    );
}
