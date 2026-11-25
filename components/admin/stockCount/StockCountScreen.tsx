"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ProductSelector, type ProductOption } from "@/components/admin/ProductSelector";
import { buttonClass, cardClass, hintClass, inputClass, labelClass, selectClass } from "@/components/admin/ui/styles";
import {
    MISSING_REASONS,
    STOCK_COUNT_LIMITS,
    STOCK_COUNT_REASON_LABELS,
    SURPLUS_REASONS,
} from "@/lib/inventory/stockCount";
import type {
    StockCountAction,
    StockCountDTO,
    StockCountOverview,
    StockCountQueueItem,
    StockCountReason,
    StockCountSettingsDTO,
    StockCountStatus,
} from "@/types/shared/stockCount";

const STATUS_LABELS: Record<StockCountStatus, string> = {
    matched: "Coincidió",
    difference: "Diferencia sin resolver",
    adjusted: "Stock ajustado",
    pending_sale: "Venta pendiente",
    dismissed: "Descartado",
    superseded: "Recontado",
};

const STATUS_CLASS: Record<StockCountStatus, string> = {
    matched: "bg-green-500/10 text-green-300",
    difference: "bg-amber-500/10 text-amber-300",
    adjusted: "bg-blue-500/10 text-blue-300",
    pending_sale: "bg-purple-500/10 text-purple-300",
    dismissed: "bg-gray-700 text-gray-300",
    superseded: "bg-gray-700 text-gray-400",
};

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const shortDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const units = (n: number) => `${n} ${Math.abs(n) === 1 ? "unidad" : "unidades"}`;

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Error de conexión");
    return body as T;
}

/** "Faltan 2" / "Sobran 3" / "Coincide" */
export function describeDifference(difference: number): string {
    if (difference === 0) return "Coincide";
    return difference < 0 ? `Faltan ${units(-difference)}` : `Sobran ${units(difference)}`;
}

function Thumb({ image, name }: { image: string | null; name: string }) {
    if (!image) return <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-800" />;
    return (
        <Image src={image} alt={name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
    );
}

export function StockCountScreen({ initial }: { initial: StockCountOverview }) {
    const [overview, setOverview] = useState(initial);
    const [extra, setExtra] = useState(0);
    const [notice, setNotice] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);

    const refresh = async (nextExtra = extra) => {
        const { data } = await readJson<{ data: StockCountOverview }>(
            await fetch(`/api/admin/stock-counts?extra=${nextExtra}`, { cache: "no-store" }),
        );
        setOverview(data);
    };

    const onCounted = async (count: StockCountDTO) => {
        setNotice(
            count.difference === 0
                ? { tone: "ok", text: `${count.productName}: coincide (${count.counted}).` }
                : {
                      tone: "warn",
                      text: `${count.productName}: ${describeDifference(count.difference).toLowerCase()} (debería haber ${count.expected.expected}, contaste ${count.counted}). Resolvelo abajo o recontá.`,
                  },
        );
        await refresh().catch(() => {});
    };

    const onError = (error: unknown) =>
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Error" });

    const daily = overview.settings.stockCountDailyProducts;
    const done = overview.countedToday >= daily;

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <section className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-gray-400">Contados hoy</p>
                        <p className="text-2xl font-bold text-white">
                            {overview.countedToday} <span className="text-base text-gray-400">de {daily}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        className={buttonClass.secondary}
                        onClick={() => {
                            const next = extra + 5;
                            setExtra(next);
                            refresh(next).catch(onError);
                        }}
                    >
                        Contar 5 más
                    </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${Math.min(100, (overview.countedToday / daily) * 100)}%` }}
                    />
                </div>
                <p className={`${hintClass} mt-3`}>
                    Contá todo lo que hay en el local, incluido lo apartado para pedidos que todavía no se entregaron.
                    Cuánto dice el sistema se ve recién al guardar, para no condicionar el conteo.
                </p>
            </section>

            {notice && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                        notice.tone === "ok"
                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                            : notice.tone === "warn"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                              : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                >
                    {notice.text}
                </div>
            )}

            <section>
                <h2 className="mb-2 text-sm font-semibold text-gray-300">Para contar hoy</h2>
                {overview.queue.length === 0 ? (
                    <p className={`${cardClass} p-4 text-sm text-gray-400`}>
                        {done
                            ? "Listo por hoy. Si querés seguir, tocá “Contar 5 más”."
                            : "No hay más productos para contar: todos se contaron hace poco."}
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {overview.queue.map((item) => (
                            <QueueRow key={item.productId} item={item} onCounted={onCounted} onError={onError} />
                        ))}
                    </div>
                )}
            </section>

            <OtherProductCount onCounted={onCounted} onError={onError} />

            {overview.differences.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-gray-300">
                        Diferencias para resolver ({overview.differences.length})
                    </h2>
                    <div className="flex flex-col gap-3">
                        {overview.differences.map((count) => (
                            <DifferenceCard
                                key={count.id}
                                count={count}
                                onResolved={async (text) => {
                                    setNotice({ tone: "ok", text });
                                    await refresh().catch(() => {});
                                }}
                                onError={onError}
                            />
                        ))}
                    </div>
                </section>
            )}

            <History counts={overview.history} />

            <SettingsCard
                settings={overview.settings}
                onSaved={async () => {
                    setNotice({ tone: "ok", text: "Configuración guardada." });
                    await refresh().catch(() => {});
                }}
                onError={onError}
            />
        </div>
    );
}

async function postCount(productId: string, counted: number): Promise<StockCountDTO> {
    const { data } = await readJson<{ data: StockCountDTO }>(
        await fetch("/api/admin/stock-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, counted }),
        }),
    );
    return data;
}

function CountInput({
    onSubmit,
    saving,
    label,
}: {
    onSubmit: (counted: number) => void;
    saving: boolean;
    label: string;
}) {
    const [value, setValue] = useState("");
    return (
        <form
            className="flex gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (value === "") return;
                onSubmit(Number(value));
            }}
        >
            <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Contadas"
                className={`${inputClass} w-28`}
                aria-label={label}
            />
            <button type="submit" className={buttonClass.primary} disabled={value === "" || saving}>
                {saving ? "Guardando…" : "Guardar"}
            </button>
        </form>
    );
}

function QueueRow({
    item,
    onCounted,
    onError,
}: {
    item: StockCountQueueItem;
    onCounted: (count: StockCountDTO) => void;
    onError: (error: unknown) => void;
}) {
    const [saving, setSaving] = useState(false);
    return (
        <div className={`${cardClass} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Thumb image={item.image} name={item.name} />
                <div className="min-w-0">
                    <p className="text-sm text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">
                        {item.sku && <span className="font-mono">{item.sku} · </span>}
                        {item.why.join(" · ")}
                    </p>
                </div>
            </div>
            <CountInput
                label={`Unidades contadas de ${item.name}`}
                saving={saving}
                onSubmit={async (counted) => {
                    setSaving(true);
                    try {
                        onCounted(await postCount(item.productId, counted));
                    } catch (error) {
                        onError(error);
                        setSaving(false);
                    }
                }}
            />
        </div>
    );
}

function OtherProductCount({
    onCounted,
    onError,
}: {
    onCounted: (count: StockCountDTO) => void;
    onError: (error: unknown) => void;
}) {
    const [product, setProduct] = useState<ProductOption | null>(null);
    const [saving, setSaving] = useState(false);
    return (
        <section className={`${cardClass} p-4`}>
            <h2 className="mb-1 text-sm font-semibold text-gray-300">Contar otro producto</h2>
            <p className={`${hintClass} mb-3`}>Si viste algo raro en una estantería, contalo aunque no esté en la lista.</p>
            <ProductSelector value={product} onChange={setProduct} statusAll excludeBundles />
            {product && (
                <div className="mt-3">
                    <CountInput
                        key={product.id}
                        label={`Unidades contadas de ${product.name}`}
                        saving={saving}
                        onSubmit={async (counted) => {
                            setSaving(true);
                            try {
                                onCounted(await postCount(product.id, counted));
                                setProduct(null);
                            } catch (error) {
                                onError(error);
                            } finally {
                                setSaving(false);
                            }
                        }}
                    />
                </div>
            )}
        </section>
    );
}

/** De dónde sale lo que debería haber */
function ExpectedBreakdown({ count }: { count: StockCountDTO }) {
    const e = count.expected;
    const parts = [`${e.totalStock} en el sistema`];
    if (e.pendingSalesUnits) parts.push(`− ${e.pendingSalesUnits} en ventas escaneadas sin formalizar`);
    if (e.deliveredUnallocatedUnits) parts.push(`− ${e.deliveredUnallocatedUnits} en pedidos entregados sin lote asignado`);
    if (e.allocatedUndeliveredUnits) parts.push(`+ ${e.allocatedUndeliveredUnits} asignadas a pedidos que no salieron`);
    return (
        <p className="text-xs text-gray-500">
            Debería haber <strong className="text-gray-300">{e.expected}</strong>
            {parts.length > 1 && <> ({parts.join(" ")})</>}.
        </p>
    );
}

function DifferenceCard({
    count,
    onResolved,
    onError,
}: {
    count: StockCountDTO;
    onResolved: (text: string) => void;
    onError: (error: unknown) => void;
}) {
    const missing = count.difference < 0;
    const reasons = missing ? MISSING_REASONS : SURPLUS_REASONS;
    const [reason, setReason] = useState<StockCountReason>(reasons[0]);
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const qty = Math.abs(count.difference);

    const resolve = async (action: StockCountAction, text: string) => {
        setBusy(true);
        try {
            await readJson(
                await fetch(`/api/admin/stock-counts/${count.id}/resolve`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action, reason: action === "adjust" ? reason : null, notes }),
                }),
            );
            onResolved(text);
        } catch (error) {
            onError(error);
            setBusy(false);
        }
    };

    return (
        <div className={`${cardClass} p-4`}>
            <div className="flex items-start gap-3">
                <Thumb image={count.image} name={count.productName} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">{count.productName}</p>
                    <p className={`text-sm font-semibold ${missing ? "text-red-300" : "text-amber-300"}`}>
                        {describeDifference(count.difference)}{" "}
                        <span className="font-normal text-gray-400">(contaste {count.counted})</span>
                    </p>
                    <ExpectedBreakdown count={count} />
                    <p className="text-xs text-gray-500">
                        {shortDate(count.countedAt)}
                        {count.countedBy && ` · ${count.countedBy}`}
                    </p>
                </div>
            </div>

            <input
                className={`${inputClass} mt-3`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota opcional"
                maxLength={500}
            />

            <div className="mt-3 flex flex-col gap-2">
                {missing && (
                    <button
                        type="button"
                        className={buttonClass.primary}
                        disabled={busy}
                        onClick={() =>
                            resolve("pending_sale", `${count.productName}: quedó como venta pendiente de formalizar.`)
                        }
                    >
                        Fue una venta sin registrar ({units(qty)})
                    </button>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                        className={`${selectClass} sm:w-56`}
                        value={reason}
                        onChange={(e) => setReason(e.target.value as StockCountReason)}
                        aria-label="Motivo del ajuste"
                    >
                        {reasons.map((r) => (
                            <option key={r} value={r}>
                                {STOCK_COUNT_REASON_LABELS[r]}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className={`${buttonClass.secondary} flex-1`}
                        disabled={busy}
                        onClick={() =>
                            resolve(
                                "adjust",
                                `${count.productName}: ${missing ? `se dieron de baja ${units(qty)}` : `se sumaron ${units(qty)}`}.`,
                            )
                        }
                    >
                        {missing ? `Dar de baja ${units(qty)}` : `Sumar ${units(qty)} al stock`}
                    </button>
                </div>
                <button
                    type="button"
                    className={buttonClass.ghost}
                    disabled={busy}
                    onClick={() => resolve("dismiss", `${count.productName}: diferencia descartada, el stock no cambió.`)}
                >
                    Me equivoqué al contar (no tocar el stock)
                </button>
            </div>
            {missing && (
                <p className={hintClass}>
                    “Venta sin registrar” la deja en la{" "}
                    <Link href="/admin/pending-sales" className="text-brand hover:underline">
                        bandeja de ventas pendientes
                    </Link>{" "}
                    para cargarla como pedido. Dar de baja descuenta de los lotes más viejos.
                </p>
            )}
        </div>
    );
}

function History({ counts }: { counts: StockCountDTO[] }) {
    if (counts.length === 0) return null;
    return (
        <section className={`${cardClass} p-4`}>
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Últimos conteos</h2>
            <ul className="flex flex-col divide-y divide-gray-800">
                {counts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-white">{c.productName}</span>
                        <span className="text-gray-400">
                            {c.counted} / {c.expected.expected}
                            {c.difference !== 0 && (
                                <span className={c.difference < 0 ? "text-red-300" : "text-amber-300"}>
                                    {" "}
                                    ({c.difference > 0 ? "+" : ""}
                                    {c.difference})
                                </span>
                            )}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_CLASS[c.status]}`}>
                            {STATUS_LABELS[c.status]}
                            {c.reason && ` · ${STOCK_COUNT_REASON_LABELS[c.reason]}`}
                            {c.writeOffCost ? ` · ${money(c.writeOffCost)} s/IVA` : ""}
                        </span>
                        <span className="w-full text-xs text-gray-500">
                            {shortDate(c.countedAt)}
                            {c.countedBy && ` · ${c.countedBy}`}
                            {c.notes && ` · ${c.notes}`}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function SettingsCard({
    settings,
    onSaved,
    onError,
}: {
    settings: StockCountSettingsDTO;
    onSaved: () => void;
    onError: (error: unknown) => void;
}) {
    const [form, setForm] = useState(settings);
    const [saving, setSaving] = useState(false);
    const dirty = form.stockCountDailyProducts !== settings.stockCountDailyProducts || form.stockCountRepeatDays !== settings.stockCountRepeatDays;
    const field = (key: keyof StockCountSettingsDTO, label: string, hint: string) => (
        <div>
            <label className={labelClass} htmlFor={`sc-${key}`}>
                {label}
            </label>
            <input
                id={`sc-${key}`}
                type="number"
                min={STOCK_COUNT_LIMITS[key].min}
                max={STOCK_COUNT_LIMITS[key].max}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                className={inputClass}
            />
            <p className={hintClass}>{hint}</p>
        </div>
    );
    return (
        <details className={`${cardClass} p-4`}>
            <summary className="cursor-pointer text-sm font-semibold text-gray-300">Configuración</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field("stockCountDailyProducts", "Productos por día", "Cuántos te pide contar cada día.")}
                {field("stockCountRepeatDays", "Días hasta volver a contar", "Un producto contado no vuelve a la lista antes.")}
            </div>
            <button
                type="button"
                className={`${buttonClass.primary} mt-4`}
                disabled={!dirty || saving}
                onClick={async () => {
                    setSaving(true);
                    try {
                        await readJson(
                            await fetch("/api/admin/settings/stock-count", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(form),
                            }),
                        );
                        onSaved();
                    } catch (error) {
                        onError(error);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                {saving ? "Guardando…" : "Guardar"}
            </button>
        </details>
    );
}
