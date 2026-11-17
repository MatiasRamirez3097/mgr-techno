"use client";

import { useCallback, useEffect, useState } from "react";
import { applyPaymentSurcharge } from "@/lib/pricing";
import { referencePriceDiff } from "@/lib/priceReference/referenceMatching";
import { useStoreSettings } from "@/components/providers/StoreSettingsProvider";
import type {
    ProductReferenceLinkDTO,
    ReferenceCandidateDTO,
    ReferenceItemDTO,
    ReferenceMatchMethod,
} from "@/types/shared/priceReference";

interface Props {
    productId: string;
    // Precio de venta vigente (effectivePrice, c/IVA, contado)
    sellingPrice: number;
}

const MATCH_LABEL: Record<ReferenceMatchMethod, string> = {
    part_number: "Part number",
    ean: "EAN",
    name: "Nombre",
    manual: "Manual",
};

const formatArs = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const formatPercent = (n: number) =>
    `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

function formatAgo(iso: string | null): string {
    if (!iso) return "sin leer";
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 60) return `hace ${Math.max(minutes, 1)} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `hace ${hours} h`;
    return `hace ${Math.round(hours / 24)} días`;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { cache: "no-store", ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error de comunicación con el servidor");
    return data as T;
}

/** Diferencia de nuestro precio contra el suyo: rojo si somos más caros, verde si más baratos */
function DiffBadge({ own, reference }: { own: number; reference: number | null }) {
    const diff = referencePriceDiff(own, reference);
    if (diff === null) return <span className="text-gray-500">—</span>;
    const color =
        Math.abs(diff) < 0.005 ? "text-gray-300" : diff > 0 ? "text-red-400" : "text-emerald-300";
    return (
        <span className={`font-mono font-semibold ${color}`} title="Nuestro precio contra el suyo">
            {formatPercent(diff)}
        </span>
    );
}

function SourceBadge({ label }: { label: string }) {
    return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-sky-500/15 text-sky-300 border-sky-500/30">
            {label}
        </span>
    );
}

function ItemName({ item }: { item: ReferenceItemDTO }) {
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm text-gray-200 hover:text-white hover:underline line-clamp-1"
            title={item.name}
        >
            {item.name}
        </a>
    );
}

// Precio vigente y de lista con la diferencia contra el nuestro (contado y con recargo)
function PriceColumns({ item, own, ownList }: { item: ReferenceItemDTO; own: number; ownList: number }) {
    const hasListPrice = item.listPrice !== null && item.listPrice !== item.price;
    return (
        <>
            <div className="text-right w-28">
                <span className="block text-gray-500">Su precio</span>
                <span className="font-mono text-white">{item.price ? formatArs(item.price) : "—"}</span>{" "}
                <DiffBadge own={own} reference={item.price} />
            </div>
            <div className="text-right w-28">
                <span className="block text-gray-500">Su lista</span>
                {hasListPrice ? (
                    <>
                        <span className="font-mono text-white">{formatArs(item.listPrice!)}</span>{" "}
                        <DiffBadge own={ownList} reference={item.listPrice} />
                    </>
                ) : (
                    <span className="text-gray-500" title="Publica un solo precio">
                        igual
                    </span>
                )}
            </div>
        </>
    );
}

export function ProductPriceReferencesPanel({ productId, sellingPrice }: Props) {
    const { mercadoPagoSurchargePercent } = useStoreSettings();
    const sellingListPrice = applyPaymentSurcharge(sellingPrice, mercadoPagoSurchargePercent);

    const [links, setLinks] = useState<ProductReferenceLinkDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const [suggestions, setSuggestions] = useState<ReferenceCandidateDTO[] | null>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ReferenceCandidateDTO[] | null>(null);
    const [searching, setSearching] = useState(false);

    const linksUrl = `/api/admin/products/${productId}/price-references`;

    const loadLinks = useCallback(async () => {
        const data = await getJson<{ links: ProductReferenceLinkDTO[] }>(linksUrl);
        setLinks(data.links);
    }, [linksUrl]);

    useEffect(() => {
        let cancelled = false;
        getJson<{ links: ProductReferenceLinkDTO[] }>(linksUrl)
            .then((data) => !cancelled && setLinks(data.links))
            .catch((err) => !cancelled && setError(err.message))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [linksUrl]);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError("");
        try {
            await action();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error inesperado");
        } finally {
            setBusy(false);
        }
    }

    const createLink = (candidate: ReferenceCandidateDTO) =>
        run(async () => {
            const current = links.find((l) => l.source === candidate.source);
            if (
                current &&
                !confirm(`Ya está vinculado con "${current.name}" en ${current.sourceLabel}. ¿Reemplazarlo?`)
            ) {
                return;
            }
            await getJson(linksUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: candidate.itemId, matchMethod: candidate.matchMethod }),
            });
            await loadLinks();
            setSuggestions((prev) => prev?.filter((s) => s.source !== candidate.source) ?? null);
        });

    const removeLink = (link: ProductReferenceLinkDTO) =>
        run(async () => {
            if (!confirm(`¿Desvincular "${link.name}" de ${link.sourceLabel}? No se va a volver a vincular solo.`)) {
                return;
            }
            await getJson(`${linksUrl}/${link.id}`, { method: "DELETE" });
            setLinks((prev) => prev.filter((l) => l.id !== link.id));
        });

    async function loadSuggestions() {
        setLoadingSuggestions(true);
        setError("");
        try {
            const data = await getJson<{ suggestions: ReferenceCandidateDTO[] }>(`${linksUrl}/suggestions`);
            setSuggestions(data.suggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al buscar coincidencias");
        } finally {
            setLoadingSuggestions(false);
        }
    }

    async function search() {
        if (!query.trim()) return;
        setSearching(true);
        setError("");
        try {
            const params = new URLSearchParams({ q: query.trim() });
            const data = await getJson<{ items: ReferenceCandidateDTO[] }>(
                `/api/admin/price-references/search?${params.toString()}`,
            );
            setResults(data.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al buscar");
        } finally {
            setSearching(false);
        }
    }

    const linkedItemIds = new Set(links.map((l) => l.itemId));

    const renderCandidates = (candidates: ReferenceCandidateDTO[], emptyMessage: string) => {
        const open = candidates.filter((c) => !linkedItemIds.has(c.itemId));
        if (!open.length) return <p className="text-xs text-gray-500">{emptyMessage}</p>;
        return (
            <div className="space-y-2">
                {open.map((c) => (
                    <div
                        key={c.itemId}
                        className="flex flex-col md:flex-row md:items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <SourceBadge label={c.sourceLabel} />
                                {c.sku && <span className="text-[11px] font-mono text-gray-400">{c.sku}</span>}
                                {c.matchMethod !== "manual" && (
                                    <span className="text-[10px] text-gray-500">
                                        {MATCH_LABEL[c.matchMethod]}
                                        {c.matchMethod === "name"
                                            ? ` ${Math.round(c.score * 100)}%`
                                            : `: ${c.matchedValue}`}
                                    </span>
                                )}
                                {!c.inStock && <span className="text-[10px] font-bold text-gray-500">SIN STOCK</span>}
                            </div>
                            <ItemName item={c} />
                        </div>
                        <div className="flex items-center gap-4 text-xs shrink-0">
                            <PriceColumns item={c} own={sellingPrice} ownList={sellingListPrice} />
                            <button
                                type="button"
                                onClick={() => createLink(c)}
                                disabled={busy}
                                className="px-3 py-1.5 rounded-lg bg-brand hover:opacity-90 text-xs font-semibold text-white transition disabled:opacity-50"
                            >
                                Vincular
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-base font-bold text-white">Referencias de precio</h2>
                    <p className="text-xs text-gray-500">
                        Precio de venta en otras tiendas. El nuestro: {formatArs(sellingPrice)} contado ·{" "}
                        {formatArs(sellingListPrice)} con recargo ({mercadoPagoSurchargePercent}%). El % compara el
                        nuestro contra el suyo: rojo = somos más caros.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadSuggestions}
                    disabled={loadingSuggestions}
                    className="px-3 py-1.5 rounded-lg bg-brand/20 hover:bg-brand/30 text-xs font-semibold text-brand border border-brand/30 transition disabled:opacity-50"
                >
                    {loadingSuggestions ? "Buscando…" : "Buscar coincidencias"}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
            )}

            {loading ? (
                <p className="text-sm text-gray-500">Cargando referencias…</p>
            ) : links.length === 0 ? (
                <p className="text-sm text-gray-500 border border-dashed border-gray-700 rounded-lg px-3 py-4 text-center">
                    Este producto no está vinculado con ninguna tienda de referencia.
                </p>
            ) : (
                <div className="space-y-2">
                    {links.map((link) => (
                        <div
                            key={link.id}
                            className="flex flex-col md:flex-row md:items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <SourceBadge label={link.sourceLabel} />
                                    {link.sku && (
                                        <span className="text-[11px] font-mono text-gray-400">{link.sku}</span>
                                    )}
                                    <span className="text-[10px] text-gray-500">{MATCH_LABEL[link.matchMethod]}</span>
                                    {!link.available ? (
                                        <span className="text-[10px] font-bold text-red-400">YA NO ESTÁ EN LA TIENDA</span>
                                    ) : (
                                        !link.inStock && (
                                            <span className="text-[10px] font-bold text-gray-400">SIN STOCK</span>
                                        )
                                    )}
                                </div>
                                <ItemName item={link} />
                                <p className="text-[11px] text-gray-500">
                                    Leído {formatAgo(link.fetchedAt)}
                                    {link.previousPrice && link.priceChangedAt && (
                                        <>
                                            {" "}· antes {formatArs(link.previousPrice)} (cambió{" "}
                                            {formatAgo(link.priceChangedAt)})
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs shrink-0">
                                <PriceColumns item={link} own={sellingPrice} ownList={sellingListPrice} />
                                <button
                                    type="button"
                                    onClick={() => removeLink(link)}
                                    disabled={busy}
                                    className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition disabled:opacity-50"
                                    title="Desvincular"
                                    aria-label="Desvincular"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {suggestions && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-300">Coincidencias encontradas</h3>
                    {renderCandidates(
                        suggestions,
                        links.length
                            ? "No hay más coincidencias en las tiendas sin vincular."
                            : "No hay coincidencias por part number, EAN ni nombre. Buscá a mano.",
                    )}
                </div>
            )}

            <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                search();
                            }
                        }}
                        placeholder="Buscar en las tiendas de referencia por nombre o código…"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand"
                    />
                    <button
                        type="button"
                        onClick={search}
                        disabled={searching || !query.trim()}
                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white transition disabled:opacity-50"
                    >
                        {searching ? "Buscando…" : "Buscar"}
                    </button>
                </div>
                {results && renderCandidates(results, "Sin resultados.")}
            </div>
        </section>
    );
}
