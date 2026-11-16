"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteDTO, QuoteStatus } from "@/types/shared/quote";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";

interface Props {
    quotes: QuoteDTO[];
    search?: string;
    status?: string;
    // Cantidad de ítems con alerta de precio por presupuesto
    priceAlerts?: Record<string, number>;
}

const STATUS_LABELS: Record<QuoteStatus, { label: string; color: string }> = {
    draft: {
        label: "Borrador",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    },
    sent: {
        label: "Enviado",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    accepted: {
        label: "Aceptado",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    expired: {
        label: "Vencido",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    rejected: {
        label: "Rechazado",
        color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    },
    converted: {
        label: "Convertido a Orden",
        color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
};

export function QuotesTable({ quotes, search, status, priceAlerts }: Props) {
    const router = useRouter();
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 2,
        }).format(val || 0);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return "-";
        }
    };

    const isExpired = (quote: QuoteDTO) => {
        if (quote.status === "expired") return true;
        if (quote.status === "converted" || quote.status === "rejected") return false;
        if (!quote.expirationDate) return false;
        return new Date(quote.expirationDate) < new Date();
    };

    const handleConvert = async (quote: QuoteDTO) => {
        if (
            !confirm(
                `¿Deseas convertir el presupuesto ${quote.number} en una Orden de venta? Se creará una orden oficial para el cliente.`
            )
        ) {
            return;
        }

        setActionLoadingId(quote.id);
        setActionMessage(null);

        try {
            const res = await fetch(`/api/admin/quotes/${quote.id}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al convertir presupuesto");
            }

            setActionMessage({
                type: "success",
                text: `¡Presupuesto convertido a orden exitosamente! Redirigiendo a orden...`,
            });

            setTimeout(() => {
                if (data.orderId) {
                    router.push(`/admin/orders/${data.orderId}`);
                } else {
                    router.refresh();
                }
            }, 1000);
        } catch (err: any) {
            setActionMessage({
                type: "error",
                text: err.message || "Error al convertir presupuesto",
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (quote: QuoteDTO) => {
        if (
            !confirm(
                `¿Estás seguro de que deseas eliminar el presupuesto ${quote.number}? Esta acción no se puede deshacer.`
            )
        ) {
            return;
        }

        setActionLoadingId(quote.id);
        setActionMessage(null);

        try {
            const res = await fetch(`/api/admin/quotes/${quote.id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al eliminar presupuesto");
            }

            setActionMessage({
                type: "success",
                text: "Presupuesto eliminado con éxito.",
            });
            router.refresh();
        } catch (err: any) {
            setActionMessage({
                type: "error",
                text: err.message || "Error al eliminar presupuesto",
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="space-y-4">
            {actionMessage && (
                <div
                    className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
                        actionMessage.type === "success"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                >
                    <span>{actionMessage.text}</span>
                    <button
                        type="button"
                        onClick={() => setActionMessage(null)}
                        className="text-xs underline hover:opacity-80"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            <ResponsiveTable
                rows={quotes}
                getRowKey={(quote) => quote.id}
                minWidth="900px"
                empty={
                    <>
                        No se encontraron presupuestos
                        {search ? ` para "${search}"` : ""}
                        {status && status !== "all" ? ` con filtro "${status}"` : ""}
                    </>
                }
                columns={[
                    {
                        key: "number",
                        header: "N° Presupuesto",
                        mobile: "subtitle",
                        className: "font-mono font-medium text-white whitespace-nowrap",
                        cell: (quote) => (
                            <span className="font-mono">
                                {quote.number}
                                {(priceAlerts?.[quote.id] ?? 0) > 0 && (
                                    <span
                                        className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30"
                                        title="Cambió el costo o el dólar de ítems de distribuidores"
                                    >
                                        ⚠ {priceAlerts![quote.id]} precio{priceAlerts![quote.id] > 1 ? "s" : ""}
                                    </span>
                                )}
                            </span>
                        ),
                    },
                    {
                        key: "customer",
                        header: "Cliente",
                        mobile: "title",
                        cell: (quote) => (
                            <Link href={`/admin/quotes/${quote.id}`} className="block hover:underline md:no-underline">
                                <span className="font-medium text-white">{quote.customer?.name || "Sin nombre"}</span>
                                <span className="block text-xs font-normal text-gray-400">
                                    {quote.customer?.documentType && quote.customer?.documentNumber
                                        ? `${quote.customer.documentType}: ${quote.customer.documentNumber}`
                                        : quote.customer?.email || ""}
                                </span>
                            </Link>
                        ),
                    },
                    {
                        key: "date",
                        header: "Emisión",
                        className: "text-gray-300 whitespace-nowrap text-xs",
                        cell: (quote) => formatDate(quote.date),
                    },
                    {
                        key: "expiration",
                        header: "Vencimiento",
                        className: "whitespace-nowrap text-xs",
                        cell: (quote) => {
                            const expired = isExpired(quote) && quote.status !== "converted";
                            return (
                                <span
                                    className={
                                        expired ? "text-red-400 font-medium inline-flex items-center gap-1" : "text-gray-300"
                                    }
                                >
                                    {formatDate(quote.expirationDate)}
                                    {expired && (
                                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                            Vencido
                                        </span>
                                    )}
                                </span>
                            );
                        },
                    },
                    {
                        key: "items",
                        header: "Ítems",
                        align: "center",
                        mobile: "hidden",
                        className: "text-gray-300 text-xs",
                        cell: (quote) => quote.items?.length || 0,
                    },
                    {
                        key: "total",
                        header: "Total",
                        align: "right",
                        className: "font-medium text-white whitespace-nowrap",
                        cell: (quote) => formatCurrency(quote.total),
                    },
                    {
                        key: "status",
                        header: "Estado",
                        align: "center",
                        mobile: "badge",
                        className: "whitespace-nowrap",
                        cell: (quote) => {
                            const statusCfg = STATUS_LABELS[quote.status] || {
                                label: quote.status,
                                color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                            };
                            return (
                                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusCfg.color}`}>
                                    {statusCfg.label}
                                </span>
                            );
                        },
                    },
                    {
                        key: "actions",
                        header: "Acciones",
                        align: "right",
                        mobile: "actions",
                        className: "whitespace-nowrap",
                        cell: (quote) => {
                            const isLoading = actionLoadingId === quote.id;
                            return (
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <a
                                        href={`/api/admin/quotes/${quote.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Ver / Imprimir comprobante PDF (Letra X)"
                                        className="inline-flex items-center gap-1.5 rounded-lg p-2 md:p-1.5 transition disabled:opacity-50 text-gray-400 hover:text-brand hover:bg-brand/10"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span className="text-xs md:hidden">PDF</span>
                                    </a>

                                    <Link
                                        href={`/admin/quotes/${quote.id}`}
                                        title="Editar presupuesto"
                                        className="inline-flex items-center gap-1.5 rounded-lg p-2 md:p-1.5 transition disabled:opacity-50 text-gray-400 hover:text-white hover:bg-gray-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                        <span className="text-xs md:hidden">Editar</span>
                                    </Link>

                                    {quote.status !== "converted" && (
                                        <button
                                            type="button"
                                            onClick={() => handleConvert(quote)}
                                            disabled={isLoading}
                                            title="Convertir a Orden de venta"
                                            className="inline-flex items-center gap-1.5 rounded-lg p-2 md:p-1.5 transition disabled:opacity-50 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                                />
                                            </svg>
                                            <span className="text-xs md:hidden">A orden</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(quote)}
                                        disabled={isLoading}
                                        title="Eliminar presupuesto"
                                        className="inline-flex items-center gap-1.5 rounded-lg p-2 md:p-1.5 transition disabled:opacity-50 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                        <span className="text-xs md:hidden">Eliminar</span>
                                    </button>
                                </div>
                            );
                        },
                    },
                ]}
            />
        </div>
    );
}
