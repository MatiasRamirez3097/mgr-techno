"use client";

import { useCallback, useEffect, useState } from "react";
import {
    DISTRIBUTOR_LABELS,
    hasDistributorStock,
    marginOverCost,
    toDistributorKey,
} from "@/lib/distributors/productLinks";
import type { NormalizedProduct } from "@/types/shared/distributor";
import type { ComparatorCategoryDTO } from "@/types/shared/comparatorCategory";
import {
    DISTRIBUTOR_KEYS,
    type CreateDistributorLinkInput,
    type DistributorKey,
    type DistributorLinkSuggestion,
    type ProductDistributorLinkDTO,
} from "@/types/shared/distributorLink";

interface Props {
    productId: string;
    // Precio de venta vigente (effectivePrice, c/IVA) para mostrar el margen
    sellingPrice: number;
}

const BADGE: Record<DistributorKey, string> = {
    elit: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    newbytes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    invid: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    air: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const MATCH_LABEL = { part_number: "Part number", ean: "EAN", manual: "Manual" } as const;

const formatArs = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const formatPercent = (n: number) =>
    `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

const hasStock = hasDistributorStock;

async function fetchLinks(productId: string): Promise<ProductDistributorLinkDTO[]> {
    const res = await fetch(`/api/admin/products/${productId}/distributor-links`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar vínculos");
    return data.links || [];
}

function Badge({ distributor }: { distributor: DistributorKey }) {
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${BADGE[distributor]}`}>
            {DISTRIBUTOR_LABELS[distributor]}
        </span>
    );
}

function MarginBadge({ price, cost }: { price: number; cost: number | null }) {
    const margin = marginOverCost(price, cost);
    if (margin === null || price <= 0) return <span className="text-gray-500">—</span>;
    return (
        <span className={`font-mono font-semibold ${margin < 0 ? "text-red-400" : "text-emerald-300"}`}>
            {formatPercent(margin)}
        </span>
    );
}

export function ProductDistributorLinksPanel({ productId, sellingPrice }: Props) {
    const [links, setLinks] = useState<ProductDistributorLinkDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const [suggestions, setSuggestions] = useState<DistributorLinkSuggestion[] | null>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<{ key: string; name: string }[]>([]);
    const [results, setResults] = useState<NormalizedProduct[] | null>(null);
    const [searching, setSearching] = useState(false);

    // Categorías del comparador para acotar la búsqueda (si falla, se busca sin categoría)
    useEffect(() => {
        let cancelled = false;
        fetch("/api/admin/distributors/categories", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : { categories: [] }))
            .then((data: { categories?: ComparatorCategoryDTO[] }) => {
                if (cancelled) return;
                setCategories(
                    (data.categories ?? []).filter((c) => c.active).map((c) => ({ key: c.key, name: c.name })),
                );
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    // `loading` sólo cubre la carga inicial; las recargas posteriores no ocultan la lista
    const loadLinks = useCallback(async () => {
        try {
            setLinks(await fetchLinks(productId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al cargar vínculos");
        }
    }, [productId]);

    useEffect(() => {
        let cancelled = false;
        fetchLinks(productId)
            .then((data) => !cancelled && setLinks(data))
            .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Error al cargar vínculos"))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [productId]);

    async function createLink(input: CreateDistributorLinkInput) {
        const distributor = toDistributorKey(input.distributor);
        const current = links.find((l) => l.distributor === distributor);
        if (
            current &&
            !confirm(`Ya está vinculado con "${current.name}" en ${DISTRIBUTOR_LABELS[current.distributor]}. ¿Reemplazarlo?`)
        ) {
            return;
        }
        setBusy(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/products/${productId}/distributor-links`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al vincular");
            await loadLinks();
            setSuggestions((prev) =>
                prev?.filter(
                    (s) => !(s.distributor === distributor && s.distributorProductId === input.distributorProductId),
                ) ?? null,
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al vincular");
        } finally {
            setBusy(false);
        }
    }

    async function removeLink(link: ProductDistributorLinkDTO) {
        if (!confirm(`¿Desvincular "${link.name}" de ${DISTRIBUTOR_LABELS[link.distributor]}?`)) return;
        setBusy(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/products/${productId}/distributor-links/${link.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al desvincular");
            setLinks((prev) => prev.filter((l) => l.id !== link.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al desvincular");
        } finally {
            setBusy(false);
        }
    }

    async function loadSuggestions() {
        setLoadingSuggestions(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/products/${productId}/distributor-links/suggestions`, {
                cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al buscar coincidencias");
            setSuggestions(data.suggestions || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al buscar coincidencias");
        } finally {
            setLoadingSuggestions(false);
        }
    }

    async function search(nextCategory = category) {
        if (!query.trim() && !nextCategory) return;
        setSearching(true);
        setError("");
        try {
            const params = new URLSearchParams({ q: query.trim() });
            if (nextCategory) params.set("category", nextCategory);
            const res = await fetch(`/api/admin/distributors/search?${params.toString()}`, {
                cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error buscando en distribuidores");
            setResults(data.products || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error buscando en distribuidores");
        } finally {
            setSearching(false);
        }
    }

    // Lo ya vinculado no se vuelve a ofrecer (al reemplazar un vínculo, el anterior reaparece)
    const linkedKeys = new Set(links.map((l) => `${l.distributor}:${l.distributorProductId}`));
    const linkedByDistributor = new Map(links.map((l) => [l.distributor, l]));

    const suggestionCandidates: Candidate[] = (suggestions ?? []).map((s) => ({
        key: `${s.distributor}:${s.distributorProductId}`,
        distributor: s.distributor,
        sku: s.distributorSku,
        name: s.name,
        price: s.price,
        stock: s.stock,
        stockLabel: s.stockLabel,
        note: `${MATCH_LABEL[s.matchMethod]}: ${s.matchedValue}`,
        input: {
            distributor: s.distributor,
            distributorProductId: s.distributorProductId,
            distributorSku: s.distributorSku,
            name: s.name,
            link: s.link,
            image: s.image,
            price: s.price,
            stock: s.stock,
            stockLabel: s.stockLabel ?? null,
            matchMethod: s.matchMethod,
        },
    }));

    const resultCandidates: Candidate[] = (results ?? []).flatMap((p) => {
        const distributor = toDistributorKey(p.distributor);
        if (!distributor) return [];
        return [
            {
                key: `${distributor}:${p.id}`,
                distributor,
                sku: p.sku,
                name: p.name,
                price: p.price,
                stock: p.stock,
                stockLabel: p.stockLabel,
                input: {
                    distributor,
                    distributorProductId: String(p.id),
                    distributorSku: p.sku,
                    name: p.name,
                    link: p.link,
                    image: p.image,
                    price: p.price,
                    stock: p.stock,
                    stockLabel: p.stockLabel ?? null,
                    matchMethod: "manual" as const,
                },
            },
        ];
    });

    const cheapest = links
        .filter((l) => l.available && l.lastPrice && hasStock(l.lastStock, l.lastStockLabel))
        .reduce<ProductDistributorLinkDTO | null>((min, l) => (!min || l.lastPrice! < min.lastPrice! ? l : min), null);

    return (
        <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-base font-bold text-white">Distribuidores</h2>
                    <p className="text-xs text-gray-500">
                        Costos con IVA en pesos. Margen sobre el costo con el precio de venta actual ({formatArs(sellingPrice)}).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadSuggestions}
                    disabled={loadingSuggestions}
                    className="px-3 py-1.5 rounded-lg bg-brand/20 hover:bg-brand/30 text-xs font-semibold text-brand border border-brand/30 transition disabled:opacity-50"
                >
                    {loadingSuggestions ? "Buscando…" : "Buscar coincidencias (part number / EAN)"}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Vínculos actuales */}
            {loading ? (
                <p className="text-sm text-gray-500">Cargando vínculos…</p>
            ) : links.length === 0 ? (
                <p className="text-sm text-gray-500 border border-dashed border-gray-700 rounded-lg px-3 py-4 text-center">
                    Este producto no está vinculado con ningún distribuidor.
                </p>
            ) : (
                <div className="space-y-2">
                    {links.map((link) => {
                        const inStock = hasStock(link.lastStock, link.lastStockLabel);
                        return (
                            <div
                                key={link.id}
                                className={`flex flex-col md:flex-row md:items-center gap-2 rounded-lg border px-3 py-2 ${
                                    cheapest?.id === link.id
                                        ? "border-emerald-500/40 bg-emerald-500/5"
                                        : "border-gray-800 bg-gray-800/40"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <Badge distributor={link.distributor} />
                                        <span className="text-[11px] font-mono text-gray-400">{link.distributorSku}</span>
                                        <span className="text-[10px] text-gray-500">{MATCH_LABEL[link.matchMethod]}</span>
                                        {cheapest?.id === link.id && (
                                            <span className="text-[10px] font-bold text-emerald-300">MEJOR COSTO</span>
                                        )}
                                        {!link.available && (
                                            <span className="text-[10px] font-bold text-red-400">YA NO ESTÁ EN EL CATÁLOGO</span>
                                        )}
                                    </div>
                                    {link.link ? (
                                        <a
                                            href={link.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-gray-200 hover:text-white hover:underline line-clamp-1"
                                            title={link.name}
                                        >
                                            {link.name}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-200 line-clamp-1" title={link.name}>
                                            {link.name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs shrink-0">
                                    <div className="text-right">
                                        <span className="block text-gray-500">Costo</span>
                                        <span className="font-mono text-white">
                                            {link.lastPrice ? formatArs(link.lastPrice) : "—"}
                                        </span>
                                    </div>
                                    <div className="text-right w-24">
                                        <span className="block text-gray-500">Stock</span>
                                        <span className={inStock ? "text-emerald-400" : "text-red-400"}>
                                            {link.lastStockLabel || (inStock ? `${link.lastStock} un.` : "Sin stock")}
                                        </span>
                                    </div>
                                    <div className="text-right w-16">
                                        <span className="block text-gray-500">Margen</span>
                                        <MarginBadge price={sellingPrice} cost={link.lastPrice} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLink(link)}
                                        disabled={busy}
                                        className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition disabled:opacity-50"
                                        title="Desvincular"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {links.some((l) => l.distributor === "elit" || l.distributor === "newbytes") && (
                        <p className="text-[11px] text-gray-500">
                            Elit y NewBytes muestran el costo del momento en que se vincularon.
                        </p>
                    )}
                </div>
            )}


            {/* Sugerencias */}
            {suggestions && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-300">Coincidencias encontradas</h3>
                    {suggestions.length === 0 ? (
                        <p className="text-xs text-gray-500">
                            No hay coincidencias por part number o EAN. Revisá el MPN/EAN del producto o buscá a mano.
                        </p>
                    ) : (
                        <GroupedCandidates
                            candidates={suggestionCandidates}
                            linkedKeys={linkedKeys}
                            linkedByDistributor={linkedByDistributor}
                            sellingPrice={sellingPrice}
                            disabled={busy}
                            onLink={createLink}
                            emptyMessage="Ya vinculaste todas las coincidencias."
                        />
                    )}
                </div>
            )}

            {/* Búsqueda manual */}
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
                        placeholder="Buscar en distribuidores por nombre o código…"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand"
                    />
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            // Con algo escrito (o sólo la categoría) se vuelve a buscar al cambiarla
                            if (query.trim() || e.target.value) search(e.target.value);
                            else setResults(null);
                        }}
                        className="sm:w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand"
                        aria-label="Categoría del comparador"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map((c) => (
                            <option key={c.key} value={c.key}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => search()}
                        disabled={searching || (!query.trim() && !category)}
                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 border border-gray-700 transition disabled:opacity-50"
                    >
                        {searching ? "Buscando…" : "Buscar"}
                    </button>
                </div>
                {results && (
                    <div className="max-h-[28rem] overflow-y-auto pr-1">
                        {results.length === 0 ? (
                            <p className="text-xs text-gray-500">Sin resultados.</p>
                        ) : (
                            <GroupedCandidates
                                candidates={resultCandidates}
                                linkedKeys={linkedKeys}
                                linkedByDistributor={linkedByDistributor}
                                sellingPrice={sellingPrice}
                                disabled={busy}
                                onLink={createLink}
                                emptyMessage="Todos los resultados ya están vinculados."
                            />
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

interface Candidate {
    // distribuidor:id, para no ofrecer lo que ya está vinculado
    key: string;
    distributor: DistributorKey;
    sku: string;
    name: string;
    price: number;
    stock: number;
    stockLabel?: string;
    note?: string;
    input: CreateDistributorLinkInput;
}

/**
 * Candidatos agrupados por distribuidor (se vincula uno por distribuidor), conservando el
 * orden recibido dentro de cada grupo. Oculta los que ya están vinculados.
 */
function GroupedCandidates(props: {
    candidates: Candidate[];
    linkedKeys: Set<string>;
    linkedByDistributor: Map<DistributorKey, ProductDistributorLinkDTO>;
    sellingPrice: number;
    disabled: boolean;
    onLink: (input: CreateDistributorLinkInput) => void;
    emptyMessage: string;
}) {
    const [collapsed, setCollapsed] = useState<Set<DistributorKey>>(new Set());

    const groups = DISTRIBUTOR_KEYS.map((distributor) => ({
        distributor,
        items: props.candidates.filter((c) => c.distributor === distributor && !props.linkedKeys.has(c.key)),
    })).filter((g) => g.items.length > 0);

    if (groups.length === 0) return <p className="text-xs text-gray-500">{props.emptyMessage}</p>;

    const toggle = (distributor: DistributorKey) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(distributor)) next.delete(distributor);
            else next.add(distributor);
            return next;
        });

    return (
        <div className="space-y-3">
            {groups.map(({ distributor, items }) => {
                const current = props.linkedByDistributor.get(distributor);
                const isCollapsed = collapsed.has(distributor);
                return (
                    <div key={distributor} className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() => toggle(distributor)}
                            className="w-full flex flex-wrap items-center gap-2 text-left"
                            aria-expanded={!isCollapsed}
                        >
                            <span className="text-gray-500 text-[10px] w-3">{isCollapsed ? "▶" : "▼"}</span>
                            <Badge distributor={distributor} />
                            <span className="text-xs text-gray-400">
                                {items.length} {items.length === 1 ? "resultado" : "resultados"}
                            </span>
                            {current && (
                                <span className="text-[11px] text-amber-300/80 line-clamp-1">
                                    Ya vinculado con “{current.name}”: elegir otro lo reemplaza
                                </span>
                            )}
                        </button>
                        {!isCollapsed &&
                            items.map((c) => (
                                <CandidateRow
                                    key={c.key}
                                    candidate={c}
                                    sellingPrice={props.sellingPrice}
                                    disabled={props.disabled}
                                    onLink={() => props.onLink(c.input)}
                                />
                            ))}
                    </div>
                );
            })}
        </div>
    );
}

function CandidateRow({
    candidate,
    sellingPrice,
    disabled,
    onLink,
}: {
    candidate: Candidate;
    sellingPrice: number;
    disabled: boolean;
    onLink: () => void;
}) {
    const inStock = hasStock(candidate.stock, candidate.stockLabel);
    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/20 px-3 py-2">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-gray-400">{candidate.sku}</span>
                    {candidate.note && <span className="text-[10px] text-brand">{candidate.note}</span>}
                </div>
                <p className="text-sm text-gray-200 line-clamp-1" title={candidate.name}>
                    {candidate.name}
                </p>
            </div>
            <div className="flex items-center gap-4 text-xs shrink-0">
                <span className="font-mono text-white">{formatArs(candidate.price)}</span>
                <span className={`w-24 text-right ${inStock ? "text-emerald-400" : "text-red-400"}`}>
                    {candidate.stockLabel || (inStock ? `${candidate.stock} un.` : "Sin stock")}
                </span>
                <span className="w-16 text-right">
                    <MarginBadge price={sellingPrice} cost={candidate.price} />
                </span>
                <button
                    type="button"
                    onClick={onLink}
                    disabled={disabled}
                    className="px-3 py-1.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
                >
                    Vincular
                </button>
            </div>
        </div>
    );
}
