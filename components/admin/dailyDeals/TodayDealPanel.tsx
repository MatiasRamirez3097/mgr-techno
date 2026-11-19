"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/components/admin/ui/FormSection";
import { buttonClass } from "@/components/admin/ui/styles";
import { DISTRIBUTOR_LABELS } from "@/lib/distributors/productLinks";
import type { DailyDealDTO, DailyDealsOverview } from "@/types/shared/dailyDeals";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
const formatDate = (date: string) => date.split("-").reverse().join("/");

const SKIP_REASONS: Record<string, string> = {
    disabled: "Las ofertas del día están desactivadas.",
    not_started: "Las ofertas del día todavía no empiezan.",
    exists: "Ya hay una oferta para hoy.",
    no_products: "Ningún producto cumple las condiciones: no se generó la oferta.",
};

export function describeDealResult(result: { status: string; reason?: string; items?: number; shortfall?: number }) {
    if (result.status === "created") {
        return `Oferta de hoy generada con ${result.items} productos${
            result.shortfall ? ` (faltaron ${result.shortfall} para llegar a la cantidad pedida)` : ""
        }.`;
    }
    return SKIP_REASONS[result.reason ?? ""] ?? "No se generó la oferta.";
}

const STATUS_LABELS: Record<DailyDealDTO["status"], string> = {
    active: "activa",
    finished: "terminada",
    cancelled: "cancelada",
};

export function TodayDealPanel({
    overview,
    enabled,
    startDate,
}: {
    overview: DailyDealsOverview;
    enabled: boolean;
    startDate: string | null;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const current = overview.current;
    const scheduled = enabled && startDate !== null && startDate > overview.today;
    const cancelledToday = overview.history.find((d) => d.date === overview.today && d.status === "cancelled");

    async function run(action: "start" | "generate" | "regenerate" | "cancel") {
        if (action === "cancel" && !confirm("¿Cancelar la oferta de hoy? Los productos vuelven a su precio normal.")) return;
        if (action === "start" && !confirm("¿Empezar las ofertas del día ahora? Se genera la oferta de hoy en el momento.")) return;
        if (action === "regenerate" && !confirm("¿Sortear otros productos? Los actuales vuelven a su precio normal.")) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/daily-deals/today", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            setMessage({
                type: "success",
                text: action === "cancel" ? "Oferta de hoy cancelada." : describeDealResult(data.result),
            });
            router.refresh();
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Error" });
        } finally {
            setBusy(false);
        }
    }

    async function removeItem(productId: string, name: string) {
        if (!confirm(`¿Sacar "${name}" de la oferta de hoy? Vuelve a su precio normal.`)) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/daily-deals/today/items/${productId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            setMessage({ type: "success", text: `"${name}" salió de la oferta.` });
            router.refresh();
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Error" });
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <FormSection
                title={`Oferta de hoy (${formatDate(overview.today)})`}
                description="Termina a la medianoche: cada producto vuelve a su precio normal, salvo que le hayas cambiado el precio durante el día."
                headerActions={
                    enabled && (
                        <div className="flex flex-wrap gap-2">
                            {scheduled ? (
                                <button type="button" disabled={busy} onClick={() => run("start")} className={buttonClass.primary}>
                                    Empezar ahora
                                </button>
                            ) : current ? (
                                <>
                                    <button type="button" disabled={busy} onClick={() => run("regenerate")} className={buttonClass.secondary}>
                                        Sortear otros
                                    </button>
                                    <button type="button" disabled={busy} onClick={() => run("cancel")} className={buttonClass.danger}>
                                        Cancelar
                                    </button>
                                </>
                            ) : (
                                <button type="button" disabled={busy} onClick={() => run("generate")} className={buttonClass.primary}>
                                    Generar ahora
                                </button>
                            )}
                        </div>
                    )
                }
            >
                {message && (
                    <p className={`mb-3 text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                        {message.text}
                    </p>
                )}
                {!current ? (
                    <p className="text-sm text-gray-400">
                        {!enabled
                            ? "Desactivadas: hoy no hay oferta."
                            : scheduled
                              ? `Programadas: empiezan el ${formatDate(startDate)} a las 00:00. Si querés, podés empezarlas ahora.`
                              : cancelledToday
                              ? "La oferta de hoy se canceló. Podés generar otra o esperar a la de mañana."
                              : "Todavía no hay oferta para hoy. Se genera sola a las 00:00 (y cada hora, si no se pudo)."}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 border-b border-gray-800">
                                    <th className="py-2 pr-3 font-medium">Producto</th>
                                    <th className="py-2 pr-3 font-medium text-right">Precio</th>
                                    <th className="py-2 pr-3 font-medium text-right">Costo al sortear</th>
                                    <th className="py-2 pr-3 font-medium text-right">Utilidad</th>
                                    <th className="py-2 font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {current.items.map((item) => (
                                    <tr key={item.productId} className="border-b border-gray-800/60 align-top">
                                        <td className="py-2 pr-3">
                                            <a
                                                href={`/productos/${item.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-white hover:text-brand"
                                            >
                                                {item.name}
                                            </a>
                                            {item.priceChanged && (
                                                <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                                                    le cambiaste el precio: ya no está en oferta
                                                </span>
                                            )}
                                            {item.repeated && (
                                                <span className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">
                                                    repetido
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-3 text-right whitespace-nowrap">
                                            <span className="text-gray-500 line-through mr-1">{money(item.regularPrice)}</span>
                                            <span className="text-white font-semibold">{money(item.dealPrice)}</span>
                                        </td>
                                        <td className="py-2 pr-3 text-right whitespace-nowrap text-gray-300">
                                            {money(item.cost)}
                                            <span className="block text-[11px] text-gray-500">
                                                {DISTRIBUTOR_LABELS[item.costDistributor]}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3 text-right whitespace-nowrap text-white">
                                            {pct(((item.dealPrice - item.cost) / item.cost) * 100)}
                                        </td>
                                        <td className="py-2 text-right">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => removeItem(item.productId, item.name)}
                                                className="text-xs text-gray-400 hover:text-red-400"
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </FormSection>

            {overview.history.length > 0 && (
                <FormSection title="Historial" collapsible defaultCollapsed summary={`${overview.history.length} días`}>
                    <ul className="flex flex-col gap-3 text-sm">
                        {overview.history.map((deal) => (
                            <li key={deal.date} className="border-b border-gray-800/60 pb-2">
                                <span className="text-white font-medium">{formatDate(deal.date)}</span>
                                <span className="text-gray-500"> · {STATUS_LABELS[deal.status]}</span>
                                <span className="block text-gray-400">
                                    {deal.items.length === 0
                                        ? "Sin productos"
                                        : deal.items
                                              .map((i) => `${i.name}${deal.status !== "active" && !i.restored ? " (precio cambiado a mano)" : ""}`)
                                              .join(" · ")}
                                </span>
                            </li>
                        ))}
                    </ul>
                </FormSection>
            )}
        </>
    );
}
