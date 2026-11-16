"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormModal } from "@/components/admin/FormModal";
import { DISTRIBUTOR_LABELS } from "@/lib/distributors/productLinks";
import type { AutoLinkReport } from "@/types/shared/distributorLink";

/** Vincula en lote los productos con Invid y AIR por part number / EAN exacto. */
export function AutoLinkButton() {
    const router = useRouter();
    const [running, setRunning] = useState(false);
    const [report, setReport] = useState<AutoLinkReport | null>(null);
    const [error, setError] = useState("");

    async function run() {
        if (
            !confirm(
                "Se van a vincular con Invid y AIR los productos cuyo part number (MPN o SKU) o EAN coincide exacto con un único ítem. No se modifican los vínculos existentes. ¿Continuar?",
            )
        ) {
            return;
        }
        setRunning(true);
        setError("");
        try {
            const res = await fetch("/api/admin/distributors/links/auto", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error en la vinculación automática");
            setReport(data.report);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error en la vinculación automática");
        } finally {
            setRunning(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={run}
                disabled={running}
                className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 border border-gray-700 transition disabled:opacity-50"
                title="Vincula productos con Invid y AIR por part number o EAN"
            >
                {running ? "Vinculando…" : "Vincular automáticamente"}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}

            {report && (
                <FormModal title="Vinculación automática">
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-300">
                            Se revisaron {report.scannedProducts} productos con código y se crearon{" "}
                            <strong className="text-white">{report.linked}</strong> vínculos.
                        </p>
                        {report.ambiguous.length > 0 && (
                            <div>
                                <p className="text-amber-300 mb-1">
                                    {report.ambiguous.length} casos con más de un candidato (vinculalos desde el producto):
                                </p>
                                <ul className="max-h-64 overflow-y-auto space-y-1 text-xs">
                                    {report.ambiguous.map((a) => (
                                        <li key={`${a.productId}-${a.distributor}`}>
                                            <Link href={`/admin/products/${a.productId}`} className="text-gray-200 hover:underline">
                                                {a.productName}
                                            </Link>{" "}
                                            <span className="text-gray-500">
                                                · {DISTRIBUTOR_LABELS[a.distributor]}: {a.candidates} candidatos
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setReport(null)}
                                className="px-4 py-2 rounded-lg bg-brand text-white font-semibold text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </FormModal>
            )}
        </>
    );
}
