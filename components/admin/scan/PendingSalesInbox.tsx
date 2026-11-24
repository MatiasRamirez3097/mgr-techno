"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SearchableEntitySelect, type SearchableOption } from "@/components/admin/SearchableEntitySelect";
import { Tabs } from "@/components/admin/ui/Tabs";
import {
    buttonClass,
    cardClass,
    compactInputClass,
    inputClass,
    labelClass,
    selectClass,
} from "@/components/admin/ui/styles";
import { useStoreSettings } from "@/components/providers/StoreSettingsProvider";
import { applyPaymentSurcharge } from "@/lib/pricing";
import type { PendingSaleDTO, PendingSaleInboxItemDTO } from "@/types/shared/pendingSale";

type PaymentMethod = "cash" | "bank_transfer" | "mercadopago";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
    cash: "Efectivo",
    bank_transfer: "Transferencia",
    mercadopago: "Mercado Pago",
};

interface CustomerOptionSource {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    document?: { documentType?: string; number?: string };
    billing?: { phone?: string };
}

const formatPrice = (value: number) =>
    value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

interface Props {
    pending: PendingSaleInboxItemDTO[];
    history: PendingSaleDTO[];
}

/** Bandeja de ventas escaneadas: se eligen una o varias y se cargan como un pedido. */
export function PendingSalesInbox({ pending, history }: Props) {
    return (
        <Tabs
            ariaLabel="Ventas escaneadas"
            tabs={[
                {
                    id: "pendientes",
                    label: "Pendientes",
                    badge: pending.length > 0 ? String(pending.length) : undefined,
                    attention: pending.length > 0,
                    content: <PendingTab pending={pending} />,
                },
                { id: "historial", label: "Historial", content: <HistoryTab history={history} /> },
            ]}
        />
    );
}

function PendingTab({ pending }: { pending: PendingSaleInboxItemDTO[] }) {
    const router = useRouter();
    const { mercadoPagoSurchargePercent } = useStoreSettings();

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
    const [customerId, setCustomerId] = useState("");
    const [customers, setCustomers] = useState<CustomerOptionSource[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [paid, setPaid] = useState(true);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/customers", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setCustomers(data.customers || []))
            .catch(() => {})
            .finally(() => setLoadingCustomers(false));
    }, []);

    const customerOptions: SearchableOption[] = useMemo(
        () =>
            customers
                .map((c) => {
                    const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Cliente sin nombre";
                    const doc = c.document?.number || "";
                    return {
                        value: c.id,
                        label: name,
                        badge: doc ? `${c.document?.documentType || "DOC"}: ${doc}` : undefined,
                        sublabel: c.email || c.billing?.phone || undefined,
                        searchText: `${name} ${c.lastName || ""} ${c.firstName || ""} ${doc} ${c.email || ""}`,
                    };
                })
                .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" })),
        [customers],
    );

    // Precio propuesto: el de contado, o con recargo si se cobró por Mercado Pago
    const defaultPrice = (sale: PendingSaleInboxItemDTO) =>
        paymentMethod === "mercadopago"
            ? applyPaymentSurcharge(sale.currentPrice, mercadoPagoSurchargePercent)
            : sale.currentPrice;

    const priceFor = (sale: PendingSaleInboxItemDTO) => {
        const override = priceOverrides[sale.id];
        return override != null && override !== "" ? Number(override) : defaultPrice(sale);
    };

    const selectedSales = pending.filter((s) => selected.has(s.id));
    const total = selectedSales.reduce((acc, s) => acc + s.quantity * (priceFor(s) || 0), 0);
    const invalidPrice = selectedSales.some((s) => !Number.isFinite(priceFor(s)) || priceFor(s) < 0);

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const discard = async (sale: PendingSaleInboxItemDTO) => {
        if (!confirm(`¿Descartar ${sale.quantity} × ${sale.productName}? Se libera el stock reservado.`)) return;
        setError(null);
        const res = await fetch(`/api/admin/pending-sales/${sale.id}/discard`, { method: "POST" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(body.error || "Error descartando la venta");
            return;
        }
        setSelected((prev) => {
            const next = new Set(prev);
            next.delete(sale.id);
            return next;
        });
        router.refresh();
    };

    const submit = async () => {
        setSaving(true);
        setError(null);
        setCreated(null);
        try {
            const res = await fetch("/api/admin/pending-sales/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId,
                    items: selectedSales.map((s) => ({ pendingSaleId: s.id, unitPrice: priceFor(s) })),
                    paymentMethod,
                    paid,
                    notes,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Error creando el pedido");
            setCreated(body.data.orderId);
            setSelected(new Set());
            setPriceOverrides({});
            setNotes("");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error creando el pedido");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {created && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                    Pedido creado.{" "}
                    <Link href={`/admin/orders/${created}`} className="font-semibold underline">
                        Ver pedido #{created.slice(-6)}
                    </Link>{" "}
                    (asigná el inventario desde el pedido, como en cualquier venta).
                </div>
            )}
            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {pending.length === 0 ? (
                <div className={`${cardClass} p-6 text-center text-sm text-gray-400`}>
                    No hay ventas escaneadas pendientes.
                </div>
            ) : (
                <ul className={`${cardClass} divide-y divide-gray-800`}>
                    {pending.map((sale) => {
                        const isSelected = selected.has(sale.id);
                        return (
                            <li key={sale.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 shrink-0 accent-brand"
                                        checked={isSelected}
                                        onChange={() => toggle(sale.id)}
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-white">
                                            {sale.quantity} × {sale.productName}
                                        </span>
                                        <span className="block text-xs text-gray-500">
                                            {formatDate(sale.createdAt)}
                                            {sale.createdBy ? ` · ${sale.createdBy}` : ""}
                                            {sale.notes ? ` · ${sale.notes}` : ""}
                                        </span>
                                    </span>
                                </label>
                                {isSelected && (
                                    <label className="flex items-center gap-2 text-xs text-gray-400">
                                        Precio unit.
                                        <input
                                            type="number"
                                            min={0}
                                            inputMode="numeric"
                                            className={`${compactInputClass} w-28`}
                                            value={priceOverrides[sale.id] ?? String(defaultPrice(sale))}
                                            onChange={(e) =>
                                                setPriceOverrides((prev) => ({ ...prev, [sale.id]: e.target.value }))
                                            }
                                        />
                                    </label>
                                )}
                                <button type="button" className={buttonClass.ghost} onClick={() => discard(sale)}>
                                    Descartar
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {selectedSales.length > 0 && (
                <section className={`${cardClass} flex flex-col gap-4 p-4`}>
                    <h2 className="text-sm font-semibold text-white">
                        Crear pedido con {selectedSales.length}{" "}
                        {selectedSales.length === 1 ? "venta" : "ventas"}
                    </h2>

                    <div>
                        <span className={labelClass}>Cliente</span>
                        <SearchableEntitySelect
                            options={customerOptions}
                            value={customerId}
                            onChange={setCustomerId}
                            disabled={loadingCustomers}
                            placeholder={loadingCustomers ? "Cargando clientes…" : "Elegí el cliente"}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="pending-payment-method">
                                Forma de pago
                            </label>
                            <select
                                id="pending-payment-method"
                                className={selectClass}
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            >
                                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                                    <option key={m} value={m}>
                                        {PAYMENT_LABEL[m]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                className="h-5 w-5 accent-brand"
                                checked={paid}
                                onChange={(e) => setPaid(e.target.checked)}
                            />
                            Ya está cobrado
                        </label>
                    </div>

                    <input
                        className={inputClass}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Nota del pedido (opcional)"
                        maxLength={1000}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-300">
                            Total: <span className="text-lg font-bold text-white">{formatPrice(total)}</span>
                        </p>
                        <button
                            type="button"
                            className={buttonClass.primary}
                            onClick={submit}
                            disabled={saving || !customerId || invalidPrice}
                        >
                            {saving ? "Creando…" : "Crear pedido"}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        El pedido se crea como completado, con la fecha del primer escaneo, y usa el stock que
                        ya quedó reservado.
                    </p>
                </section>
            )}
        </div>
    );
}

function HistoryTab({ history }: { history: PendingSaleDTO[] }) {
    if (history.length === 0) {
        return <div className={`${cardClass} p-6 text-center text-sm text-gray-400`}>Todavía no hay historial.</div>;
    }
    return (
        <ul className={`${cardClass} divide-y divide-gray-800`}>
            {history.map((sale) => (
                <li key={sale.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">
                            {sale.quantity} × {sale.productName}
                        </p>
                        <p className="text-xs text-gray-500">
                            Escaneada {formatDate(sale.createdAt)}
                            {sale.createdBy ? ` por ${sale.createdBy}` : ""}
                            {sale.resolvedAt ? ` · resuelta ${formatDate(sale.resolvedAt)}` : ""}
                            {sale.resolvedBy ? ` por ${sale.resolvedBy}` : ""}
                        </p>
                    </div>
                    {sale.status === "converted" && sale.orderId ? (
                        <Link href={`/admin/orders/${sale.orderId}`} className="text-xs font-semibold text-brand">
                            Pedido #{sale.orderId.slice(-6)}
                        </Link>
                    ) : (
                        <span className="text-xs text-gray-500">Descartada</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
