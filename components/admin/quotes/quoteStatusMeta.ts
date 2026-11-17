import type { QuoteStatus } from "@/types/shared/quote";

/** Estados de presupuesto: etiqueta, color y siguiente paso habitual. */
export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
    sent: { label: "Enviado", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    accepted: { label: "Aceptado", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    expired: { label: "Vencido", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    rejected: { label: "Rechazado", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    converted: { label: "Convertido a Orden", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
};

export const getQuoteStatusMeta = (status: string) =>
    QUOTE_STATUS_META[status as QuoteStatus] || { label: status, color: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

// Elegibles a mano: "Convertido" sólo se alcanza convirtiendo el presupuesto en venta
export const QUOTE_MANUAL_STATUSES: { value: QuoteStatus; label: string }[] = [
    { value: "draft", label: "Borrador" },
    { value: "sent", label: "Enviado al cliente" },
    { value: "accepted", label: "Aceptado" },
    { value: "rejected", label: "Rechazado" },
    { value: "expired", label: "Vencido" },
];

/** Siguiente paso: borrador → enviado → aceptado → (convertir a venta). */
export function getNextQuoteStatus(status: string): QuoteStatus | "convert" | null {
    switch (status) {
        case "draft":
            return "sent";
        case "sent":
            return "accepted";
        case "accepted":
            return "convert";
        default:
            return null;
    }
}
