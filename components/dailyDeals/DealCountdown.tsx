"use client";

import { useCountdown } from "./useCountdown";

/** Cuenta regresiva hasta el fin de la oferta del día. */
export function DealCountdown({
    endsAt,
    variant = "inline",
    className = "",
}: {
    endsAt: string;
    variant?: "inline" | "large";
    className?: string;
}) {
    const parts = useCountdown(endsAt);

    if (variant === "large") {
        const units = [
            { label: "horas", value: parts?.hours ?? "--" },
            { label: "min", value: parts?.minutes ?? "--" },
            { label: "seg", value: parts?.seconds ?? "--" },
        ];
        return (
            <div className={`flex items-center gap-2 ${className}`} role="timer" aria-label="Tiempo restante de la oferta">
                {units.map((u, i) => (
                    <div key={u.label} className="flex items-center gap-2">
                        <div className="flex flex-col items-center rounded-lg bg-black/60 border border-brand/40 px-3 py-2 min-w-[64px]">
                            <span className="text-3xl font-black text-white tabular-nums leading-none">{u.value}</span>
                            <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">{u.label}</span>
                        </div>
                        {i < units.length - 1 && <span className="text-2xl font-black text-brand">:</span>}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <span className={`tabular-nums ${className}`} role="timer" aria-label="Tiempo restante de la oferta">
            {parts ? (parts.finished ? "Terminó" : `${parts.hours}:${parts.minutes}:${parts.seconds}`) : "--:--:--"}
        </span>
    );
}
