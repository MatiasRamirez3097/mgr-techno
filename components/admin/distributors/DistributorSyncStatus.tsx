"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
    DistributorCategorySummary,
    DistributorSyncStatusDTO,
} from "@/types/shared/distributor";

const THEMES = {
    purple: {
        box: "border-purple-500/20 bg-purple-500/5",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    orange: {
        box: "border-orange-500/20 bg-orange-500/5",
        badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    },
};

function timeAgo(iso: string | null): string {
    if (!iso) return "nunca";
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "recién";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `hace ${hours} h`;
    return `hace ${Math.round(hours / 24)} días`;
}

const isOlderThan = (iso: string | null, hours: number) =>
    !iso || Date.now() - new Date(iso).getTime() > hours * 60 * 60 * 1000;

interface Props {
    label: string;
    // Endpoint de sincronización manual (POST); sin él no se muestra el botón
    syncUrl?: string;
    theme: keyof typeof THEMES;
    status: DistributorSyncStatusDTO;
    categories: DistributorCategorySummary[];
    // Cupo máximo de requests por hora, si el distribuidor lo limita
    rateLimitMax?: number;
    // Aviso cuando la última actualización tiene más de estas horas
    staleAfterHours?: number;
    staleHint?: string;
}

// Estado de la copia local del catálogo de un distribuidor (Invid, AIR)
export const DistributorSyncStatus = ({
    label,
    syncUrl,
    theme,
    status,
    categories,
    rateLimitMax,
    staleAfterHours,
    staleHint,
}: Props) => {
    const router = useRouter();
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSync = async () => {
        if (!syncUrl) return;
        setSyncing(true);
        setMessage(null);
        try {
            const res = await fetch(syncUrl, {
                method: "POST",
            });
            const data = await res.json();
            if (data.status === "ok") {
                setMessage(
                    `Catálogo actualizado: ${data.items} artículos` +
                        (data.priceChanges ? `, ${data.priceChanges} con cambio de precio` : ""),
                );
            } else {
                setMessage(data.message || data.error || "No se pudo sincronizar");
            }
            router.refresh();
        } catch {
            setMessage("Error de conexión al sincronizar");
        } finally {
            setSyncing(false);
        }
    };

    const hasError =
        status.lastSyncStatus === "error" || status.lastSyncStatus === "partial";
    const isStale =
        staleAfterHours !== undefined && isOlderThan(status.lastSuccessfulSyncAt, staleAfterHours);

    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-4 py-3 rounded-xl border text-xs text-gray-400 ${THEMES[theme].box}`}>
            <span className={`px-2 py-0.5 rounded-md font-bold border ${THEMES[theme].badge}`}>
                {label}
            </span>
            <span>
                Catálogo:{" "}
                <strong className="text-gray-200">{status.catalogCount}</strong> artículos ·
                actualizado {timeAgo(status.lastSuccessfulSyncAt)}
            </span>
            <span>
                Dólar oficial BNA:{" "}
                <strong className="text-gray-200">
                    {status.usdRate
                        ? `$${status.usdRate.toLocaleString("es-AR")}`
                        : "sin datos"}
                </strong>{" "}
                ({timeAgo(status.usdRateUpdatedAt)})
            </span>
            {status.rateLimitRemaining !== null && rateLimitMax && (
                <span>
                    Requests disponibles esta hora: {status.rateLimitRemaining}/{rateLimitMax}
                </span>
            )}
            {hasError && status.lastSyncError && (
                <span className="text-amber-400">Último intento: {status.lastSyncError}</span>
            )}
            {isStale && staleHint && <span className="text-amber-400">{staleHint}</span>}
            {message && <span className="text-gray-200">{message}</span>}

            {syncUrl && (
                <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing || status.syncing}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 font-semibold transition"
                >
                    {syncing || status.syncing ? "Sincronizando..." : "Sincronizar ahora"}
                </button>
            )}

            {/* Categorías tal como las nombra el distribuidor, para revisar el mapeo de categorías */}
            {categories.length > 0 && (
                <details className="w-full">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
                        Ver categorías de {label} ({categories.length})
                    </summary>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                        {categories.map((cat) => (
                            <li key={cat.id} className="truncate">
                                <span className="font-mono text-gray-500">{cat.id}</span>{" "}
                                <span className="text-gray-200">{cat.name}</span>
                                {cat.parentName && (
                                    <span className="text-gray-500"> · {cat.parentName}</span>
                                )}{" "}
                                <span className="text-gray-500">({cat.count})</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
};
