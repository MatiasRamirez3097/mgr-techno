"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DISTRIBUTOR_LABELS, hasDistributorStock } from "@/lib/distributors/productLinks";
import { getMarginStatus, type MarginStatus } from "@/lib/priceReview";
import type { PriceReviewLinkSuggestion, PriceReviewRow } from "@/types/shared/priceReview";
import { DISTRIBUTOR_KEYS } from "@/types/shared/distributorLink";

interface Props {
    rows: PriceReviewRow[];
}

const formatArs = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const formatPercent = (n: number) =>
    `${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

const STATUS_STYLE: Record<MarginStatus, string> = {
    below_min: "text-red-400",
    below_target: "text-amber-300",
    ok: "text-emerald-300",
    no_cost: "text-gray-500",
};

const DISTRIBUTOR_TEXT: Record<string, string> = {
    elit: "text-blue-300",
    newbytes: "text-emerald-300",
    invid: "text-purple-300",
    air: "text-orange-300",
};

const timeAgo = (iso: string | null) => {
    if (!iso) return "";
    const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
    if (hours < 1) return "hace minutos";
    if (hours < 48) return `hace ${Math.round(hours)} h`;
    return `hace ${Math.round(hours / 24)} días`;
};

export function PriceReviewTable({ rows }: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [edited, setEdited] = useState<Record<string, string>>({});
    const [applying, setApplying] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    // Filas con las sugerencias de vínculo desplegadas
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleExpanded = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const editedPrice = (row: PriceReviewRow) => {
        const value = Number(edited[row.productId]);
        return edited[row.productId] && value > 0 ? value : null;
    };

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const selectableRows = rows.filter((r) => r.suggestedPrice || editedPrice(r));
    const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.productId));

    async function apply(updates: { productId: string; price: number }[]) {
        if (updates.length === 0) return;
        if (!confirm(`¿Actualizar el precio de ${updates.length} producto(s)?`)) return;
        setApplying(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/pricing/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error aplicando precios");
            const errors: { productId: string; error: string }[] = data.errors || [];
            setMessage({
                type: errors.length > 0 ? "error" : "success",
                text:
                    `${data.updated} precio(s) actualizados.` +
                    (errors.length > 0 ? ` Errores: ${errors.map((e) => e.error).join("; ")}` : ""),
            });
            const applied = new Set(updates.map((u) => u.productId));
            setSelected(new Set());
            setEdited((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !applied.has(id))));
            router.refresh();
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "Error aplicando precios" });
        } finally {
            setApplying(false);
        }
    }

    // Para cada seleccionado: el precio editado si hay, si no el sugerido
    const selectedUpdates = rows
        .filter((r) => selected.has(r.productId))
        .map((r) => ({ productId: r.productId, price: editedPrice(r) ?? r.suggestedPrice ?? 0 }))
        .filter((u) => u.price > 0);

    if (rows.length === 0) {
        return <p className="p-10 text-center text-sm text-gray-500">No hay productos para este filtro.</p>;
    }

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-800 bg-gray-800/20">
                <button
                    type="button"
                    onClick={() => apply(selectedUpdates)}
                    disabled={applying || selectedUpdates.length === 0}
                    className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-40"
                >
                    {applying ? "Aplicando…" : `Aplicar a seleccionados (${selectedUpdates.length})`}
                </button>
                <span className="text-xs text-gray-500">
                    Se usa el precio que escribiste o, si no, el sugerido. Si el producto tiene una oferta vigente, se cambia la oferta.
                </span>
                {message && (
                    <span className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                        {message.text}
                    </span>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-800/50 border-b border-gray-800 text-gray-400">
                        <tr>
                            <th className="px-3 py-3">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() =>
                                        setSelected(allSelected ? new Set() : new Set(selectableRows.map((r) => r.productId)))
                                    }
                                    aria-label="Seleccionar todos"
                                />
                            </th>
                            <th className="px-3 py-3 font-semibold min-w-[240px]">Producto</th>
                            <th className="px-3 py-3 font-semibold text-right">Tu precio</th>
                            <th className="px-3 py-3 font-semibold min-w-[220px]">Costos (c/IVA)</th>
                            <th className="px-3 py-3 font-semibold text-right">Últ. compra</th>
                            <th className="px-3 py-3 font-semibold text-right">Margen</th>
                            <th className="px-3 py-3 font-semibold text-right">Sugerido</th>
                            <th className="px-3 py-3 font-semibold min-w-[170px]">Nuevo precio</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {rows.map((row) => {
                            const typed = editedPrice(row);
                            const typedMargin = typed && row.bestCost ? (typed - row.bestCost) / row.bestCost : null;
                            const typedStatus = getMarginStatus(typedMargin, row.minMarginPercent, row.targetMarginPercent);
                            const canSelect = Boolean(row.suggestedPrice || typed);
                            const isExpanded = expanded.has(row.productId) && row.linkSuggestions.length > 0;
                            return (
                                <Fragment key={row.productId}>
                                    <tr className={`hover:bg-gray-800/30 align-top ${isExpanded ? "bg-gray-800/20" : ""}`}>
                                        <td className="px-3 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(row.productId)}
                                                disabled={!canSelect}
                                                onChange={() => toggle(row.productId)}
                                                aria-label={`Seleccionar ${row.name}`}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden flex items-center justify-center">
                                                    {row.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={row.image} alt="" className="w-full h-full object-contain p-0.5" />
                                                    ) : (
                                                        <span className="text-gray-600">📦</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/admin/products/${row.productId}`}
                                                        className="text-gray-100 hover:underline line-clamp-2"
                                                        title={row.name}
                                                    >
                                                        {row.name}
                                                    </Link>
                                                    <span className="text-[11px] font-mono text-gray-500">
                                                        {row.sku}
                                                        {row.status !== "publish" && ` · ${row.status}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <span className="font-mono font-semibold text-white">{formatArs(row.effectivePrice)}</span>
                                            {row.salePrice && row.salePrice < row.regularPrice && (
                                                <span className="block text-[10px] text-gray-500">
                                                    oferta · regular {formatArs(row.regularPrice)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.costs.length === 0 ? (
                                                <Link href={`/admin/products/${row.productId}`} className="text-xs text-gray-500 underline">
                                                    Sin vincular
                                                </Link>
                                            ) : (
                                                <ul className="space-y-0.5">
                                                    {row.costs.map((c) => {
                                                        const isBest = row.bestDistributor === c.distributor && row.bestCost === c.price;
                                                        return (
                                                            <li
                                                                key={c.distributor}
                                                                className={`flex items-center justify-between gap-2 text-xs ${
                                                                    !c.inStock || !c.available ? "opacity-50" : ""
                                                                }`}
                                                                title={`${c.name}${c.lastCheckedAt ? ` · ${timeAgo(c.lastCheckedAt)}` : ""}`}
                                                            >
                                                                <span className={`font-semibold ${DISTRIBUTOR_TEXT[c.distributor] ?? ""}`}>
                                                                    {DISTRIBUTOR_LABELS[c.distributor]}
                                                                    {isBest && " ★"}
                                                                </span>
                                                                <span className="font-mono text-gray-200">
                                                                    {c.recentChange !== null && (
                                                                        <span
                                                                            className={`mr-1 ${c.recentChange > 0 ? "text-red-400" : "text-emerald-400"}`}
                                                                            title="Cambio de costo en los últimos 7 días"
                                                                        >
                                                                            {c.recentChange > 0 ? "▲" : "▼"}
                                                                            {formatPercent(Math.abs(c.recentChange))}
                                                                        </span>
                                                                    )}
                                                                    {c.price ? formatArs(c.price) : "—"}
                                                                    <span className={`ml-1.5 ${c.inStock ? "text-emerald-400" : "text-red-400"}`}>
                                                                        {!c.available ? "no disp." : c.inStock ? "●" : "sin stock"}
                                                                    </span>
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                            {row.linkSuggestions.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(row.productId)}
                                                    className="mt-1 text-[11px] font-semibold text-brand hover:underline"
                                                    aria-expanded={isExpanded}
                                                >
                                                    {row.linkSuggestions.length}{" "}
                                                    {row.linkSuggestions.length === 1 ? "sugerencia" : "sugerencias"} de vínculo{" "}
                                                    {isExpanded ? "▴" : "▾"}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap text-xs">
                                            {row.lastPurchaseCost ? (
                                                <>
                                                    <span className="font-mono text-gray-200">{formatArs(row.lastPurchaseCost)}</span>
                                                    <span className="block text-[10px] text-gray-500">{timeAgo(row.lastPurchaseAt)}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <span className={`font-mono font-semibold ${STATUS_STYLE[row.marginStatus]}`}>
                                                {row.margin === null ? "—" : formatPercent(row.margin)}
                                            </span>
                                            <span
                                                className="block text-[10px] text-gray-500"
                                                title={row.marginSource ? `Margen de la categoría ${row.marginSource}` : "Margen general"}
                                            >
                                                obj. {row.targetMarginPercent}% · mín. {row.minMarginPercent}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            {row.suggestedPrice ? (
                                                <button
                                                    type="button"
                                                    onClick={() => apply([{ productId: row.productId, price: row.suggestedPrice! }])}
                                                    disabled={applying || row.suggestedPrice === row.effectivePrice}
                                                    className="font-mono text-brand hover:underline disabled:text-gray-500 disabled:no-underline"
                                                    title="Aplicar este precio"
                                                >
                                                    {formatArs(row.suggestedPrice)}
                                                </button>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={100}
                                                    value={edited[row.productId] ?? ""}
                                                    onChange={(e) =>
                                                        setEdited((prev) => ({ ...prev, [row.productId]: e.target.value }))
                                                    }
                                                    placeholder={row.suggestedPrice ? String(row.suggestedPrice) : ""}
                                                    className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono text-right outline-none focus:border-brand"
                                                />
                                                {typed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => apply([{ productId: row.productId, price: typed }])}
                                                        disabled={applying}
                                                        className="px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 border border-gray-700"
                                                    >
                                                        Aplicar
                                                    </button>
                                                )}
                                            </div>
                                            {typedMargin !== null && (
                                                <span className={`text-[10px] font-mono ${STATUS_STYLE[typedStatus]}`}>
                                                    margen {formatPercent(typedMargin)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-800/20">
                                            <td />
                                            <td colSpan={7} className="px-3 pb-4">
                                                <LinkSuggestionsList row={row} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const MATCH_TEXT = { part_number: "Part number", ean: "EAN" } as const;

/**
 * Sugerencias de vínculo de una fila, agrupadas por distribuidor: se vincula una por
 * distribuidor (al vincular, las demás de ese distribuidor dejan de mostrarse) o se descartan.
 */
function LinkSuggestionsList({ row }: { row: PriceReviewRow }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const [linkedNow, setLinkedNow] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");

    const visible = row.linkSuggestions.filter((s) => !hidden.has(s.id) && !linkedNow.has(s.distributor));
    const groups = DISTRIBUTOR_KEYS.map((distributor) => ({
        distributor,
        items: visible.filter((s) => s.distributor === distributor),
    })).filter((g) => g.items.length > 0);

    async function link(s: PriceReviewLinkSuggestion) {
        setBusy(s.id);
        setError("");
        try {
            const res = await fetch(`/api/admin/products/${row.productId}/distributor-links`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    distributor: s.distributor,
                    distributorProductId: s.distributorProductId,
                    distributorSku: s.distributorSku,
                    name: s.name,
                    link: s.link,
                    image: s.image,
                    price: s.price,
                    stock: s.stock,
                    stockLabel: s.stockLabel,
                    // Por nombre la confirmó el admin: queda como vínculo manual
                    matchMethod: s.matchMethod === "name" ? "manual" : s.matchMethod,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al vincular");
            setLinkedNow((prev) => new Set(prev).add(s.distributor));
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al vincular");
        } finally {
            setBusy(null);
        }
    }

    async function dismiss(s: PriceReviewLinkSuggestion) {
        setBusy(s.id);
        setError("");
        try {
            const res = await fetch(`/api/admin/pricing/link-suggestions/${s.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al descartar");
            setHidden((prev) => new Set(prev).add(s.id));
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al descartar");
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="rounded-xl border border-brand/20 bg-gray-900/60 p-3 space-y-3">
            <p className="text-[11px] text-gray-500">
                Posibles equivalentes encontrados automáticamente. Revisá que sea el mismo producto antes de vincular.
                Costo y margen al momento de la búsqueda.
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {groups.length === 0 ? (
                <p className="text-xs text-gray-500">No quedan sugerencias pendientes.</p>
            ) : (
                groups.map(({ distributor, items }) => (
                    <div key={distributor} className="space-y-1">
                        <span className={`text-xs font-semibold ${DISTRIBUTOR_TEXT[distributor] ?? ""}`}>
                            {DISTRIBUTOR_LABELS[distributor]}
                        </span>
                        {items.map((s) => {
                            const inStock = hasDistributorStock(s.stock, s.stockLabel);
                            const margin = s.price > 0 ? (row.effectivePrice - s.price) / s.price : null;
                            const status = getMarginStatus(margin, row.minMarginPercent, row.targetMarginPercent);
                            return (
                                <div
                                    key={s.id}
                                    className="flex flex-col md:flex-row md:items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="font-mono text-gray-400">{s.distributorSku}</span>
                                            <span className="text-brand">
                                                {s.matchMethod === "name"
                                                    ? `Nombre parecido (${Math.round(s.score * 100)}%)`
                                                    : `${MATCH_TEXT[s.matchMethod]}: ${s.matchedValue}`}
                                            </span>
                                        </div>
                                        {s.link ? (
                                            <a
                                                href={s.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-gray-200 hover:underline line-clamp-1"
                                                title={s.name}
                                            >
                                                {s.name}
                                            </a>
                                        ) : (
                                            <p className="text-xs text-gray-200 line-clamp-1" title={s.name}>
                                                {s.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs shrink-0">
                                        <span className="font-mono text-white">{formatArs(s.price)}</span>
                                        <span className={`w-20 text-right ${inStock ? "text-emerald-400" : "text-red-400"}`}>
                                            {s.stockLabel || (inStock ? `${s.stock} un.` : "Sin stock")}
                                        </span>
                                        <span className={`w-16 text-right font-mono ${STATUS_STYLE[status]}`}>
                                            {margin === null ? "—" : formatPercent(margin)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => link(s)}
                                            disabled={busy !== null}
                                            className="px-3 py-1.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
                                        >
                                            {busy === s.id ? "…" : "Vincular"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => dismiss(s)}
                                            disabled={busy !== null}
                                            className="px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-50"
                                            title="No es el mismo producto: no volver a sugerirlo"
                                        >
                                            Descartar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
}
