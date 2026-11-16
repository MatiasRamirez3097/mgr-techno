"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkPricesSyncStatusDTO } from "@/types/shared/distributorLink";

interface Props {
    status: LinkPricesSyncStatusDTO;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Estado y ejecución manual de la búsqueda de sugerencias de vínculo. */
export function LinkSuggestionsButton({ status }: Props) {
    const router = useRouter();
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    async function run() {
        setRunning(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/pricing/link-suggestions", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error buscando sugerencias");
            const errors: string[] = data.errors || [];
            setMessage({
                type: errors.length > 0 ? "error" : "success",
                text:
                    `${data.suggestions} sugerencia(s) para ${data.products} producto(s)` +
                    (errors.length ? ` · Errores: ${errors.join("; ")}` : ""),
            });
            router.refresh();
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "Error buscando sugerencias" });
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-400">
                Sugerencias de vínculo:{" "}
                {status.lastSuccessfulSyncAt ? (
                    <>buscadas el {formatDate(status.lastSuccessfulSyncAt)}</>
                ) : (
                    <>todavía no se buscaron</>
                )}
                {status.lastSyncStatus === "partial" && <span className="text-amber-300"> · con errores</span>}
                {status.lastSyncStatus === "error" && <span className="text-red-400"> · la última búsqueda falló</span>}
                <span className="text-gray-500"> · se buscan solas todos los días después de actualizar los costos</span>
            </span>
            <button
                type="button"
                onClick={run}
                disabled={running || status.syncing}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition disabled:opacity-50"
                title={status.lastSyncError ?? undefined}
            >
                {running || status.syncing ? "Buscando…" : "Buscar ahora"}
            </button>
            {message && (
                <span className={message.type === "success" ? "text-green-400" : "text-red-400"}>{message.text}</span>
            )}
        </div>
    );
}
