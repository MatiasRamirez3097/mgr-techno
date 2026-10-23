"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
    InvidCategorySummary,
    InvidSyncStatusDTO,
} from "@/types/shared/distributor";

function timeAgo(iso: string | null): string {
    if (!iso) return "nunca";
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "recién";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `hace ${hours} h`;
    return `hace ${Math.round(hours / 24)} días`;
}

interface Props {
    status: InvidSyncStatusDTO;
    categories: InvidCategorySummary[];
}

export const InvidSyncStatus = ({ status, categories }: Props) => {
    const router = useRouter();
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSync = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/distributors/invid/sync", {
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

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-4 py-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs text-gray-400">
            <span className="px-2 py-0.5 rounded-md font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                INVID
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
            {status.rateLimitRemaining !== null && (
                <span>Requests disponibles esta hora: {status.rateLimitRemaining}/50</span>
            )}
            {hasError && status.lastSyncError && (
                <span className="text-amber-400">Último intento: {status.lastSyncError}</span>
            )}
            {message && <span className="text-gray-200">{message}</span>}

            <button
                type="button"
                onClick={handleSync}
                disabled={syncing || status.syncing}
                className="ml-auto px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 font-semibold transition"
            >
                {syncing || status.syncing ? "Sincronizando..." : "Sincronizar ahora"}
            </button>

            {/* Categorías tal como las nombra Invid, para revisar el mapeo de CATEGORY_MAP */}
            {categories.length > 0 && (
                <details className="w-full">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
                        Ver categorías de Invid ({categories.length})
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
