"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDailyDeal } from "@/components/providers/DailyDealProvider";
import { DealCountdown } from "./DealCountdown";

const STORAGE_KEY = "daily-deal-modal-shown-at";
const SHOW_EVERY_MS = 3 * 60 * 60 * 1000;
const DELAY_MS = 1500;
// Donde el modal molesta o no tiene sentido
const HIDDEN_PATHS = ["/ofertas-del-dia", "/checkout", "/login", "/register", "/mi-cuenta"];

function lastShownAt() {
    try {
        return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
        return 0;
    }
}

function markShown() {
    try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
        // Sin localStorage (navegación privada): se vuelve a mostrar en la próxima carga
    }
}

/** Avisa que hay ofertas del día, como mucho una vez cada 3 h por navegador. */
export function DailyDealModal() {
    const { endsAt, productIds } = useDailyDeal();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const hidden = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const active = Boolean(endsAt) && productIds.size > 0;

    useEffect(() => {
        if (!active || hidden || Date.now() - lastShownAt() < SHOW_EVERY_MS) return;
        const timeout = setTimeout(() => {
            markShown();
            setOpen(true);
        }, DELAY_MS);
        return () => clearTimeout(timeout);
    }, [active, hidden]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    if (!open || !endsAt || hidden) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="daily-deal-modal-title"
                className="relative w-full max-w-md rounded-2xl border border-brand/50 bg-gray-950 p-6 text-center shadow-2xl shadow-brand/20"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none"
                >
                    ×
                </button>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">⚡ Sólo por hoy</p>
                <h2 id="daily-deal-modal-title" className="mt-2 text-2xl font-black text-white">
                    Ofertas del día
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                    {productIds.size === 1 ? "Un producto" : `${productIds.size} productos`} con descuento hasta la
                    medianoche.
                </p>
                <DealCountdown endsAt={endsAt} variant="large" className="justify-center my-5" />
                <Link
                    href="/ofertas-del-dia"
                    onClick={() => setOpen(false)}
                    className="block w-full rounded-lg bg-brand py-3 font-bold text-white hover:brightness-110 transition-all"
                >
                    Ver las ofertas
                </Link>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-300"
                >
                    Ahora no
                </button>
            </div>
        </div>
    );
}
