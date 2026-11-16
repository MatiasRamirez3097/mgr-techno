"use client";

import { useState } from "react";
import { ProductSelector, type ProductOption } from "@/components/admin/ProductSelector";
import type { QuoteComponentDTO, QuoteItemDTO } from "@/types/shared/quote";
import type { QuoteItemPriceAlert } from "@/lib/quotes/priceAlerts";

interface Props {
    item: QuoteItemDTO;
    onChange: (item: QuoteItemDTO) => void;
    onRemove: () => void;
    // Abre el modal de mayoristas para sumar un componente a esta PC
    onAddDistributorComponent: () => void;
    // Alertas de precio por componente (mismo orden que item.components)
    componentAlerts: QuoteItemPriceAlert[][];
    onResolveComponentAlert: (componentIndex: number, action: "refresh" | "ignore") => void;
    describeAlert: (alert: QuoteItemPriceAlert) => string;
    distributorBadge: Record<string, string>;
}

const formatArs = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

const inputClass =
    "w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-brand";

export function CustomPcQuoteItem({
    item,
    onChange,
    onRemove,
    onAddDistributorComponent,
    componentAlerts,
    onResolveComponentAlert,
    describeAlert,
    distributorBadge,
}: Props) {
    const [showInternalSelector, setShowInternalSelector] = useState(false);
    const components = item.components || [];

    const setField = <K extends keyof QuoteItemDTO>(field: K, value: QuoteItemDTO[K]) =>
        onChange({ ...item, [field]: value });

    const setComponents = (next: QuoteComponentDTO[]) => onChange({ ...item, components: next });

    const updateComponent = <K extends keyof QuoteComponentDTO>(
        index: number,
        field: K,
        value: QuoteComponentDTO[K],
    ) => setComponents(components.map((c, i) => (i === index ? { ...c, [field]: value } : c)));

    const removeComponent = (index: number) =>
        setComponents(components.filter((_, i) => i !== index));

    const addInternalComponent = (prod: ProductOption) => {
        setShowInternalSelector(false);
        const existing = components.findIndex(
            (c) => c.origin === "internal" && c.productId === prod.id,
        );
        if (existing >= 0) {
            updateComponent(existing, "quantity", components[existing].quantity + 1);
            return;
        }
        setComponents([
            ...components,
            {
                origin: "internal",
                productId: prod.id,
                name: prod.name,
                sku: prod.sku || "",
                image: prod.image || undefined,
                quantity: 1,
                costPrice: 0,
                unitPrice: prod.effectivePrice || prod.salePrice || prod.regularPrice || 0,
                taxRate: prod.taxRate ?? 10.5,
            },
        ]);
    };

    const addManualComponent = () =>
        setComponents([
            ...components,
            { origin: "manual", name: "", sku: "", quantity: 1, costPrice: 0, unitPrice: 0, taxRate: 10.5 },
        ]);

    // Resumen por PC (cantidad de cada componente por PC)
    const referenceTotal = components.reduce((acc, c) => acc + (c.unitPrice || 0) * (c.quantity || 1), 0);
    const costTotal = components.reduce((acc, c) => acc + (c.costPrice || 0) * (c.quantity || 1), 0);
    const withoutCost = components.filter((c) => !c.costPrice).length;
    const pcPrice = Number(item.unitPrice) || 0;
    const margin = costTotal > 0 ? (pcPrice - costTotal) / costTotal : null;
    const priceDiffersFromSum = components.length > 0 && Math.round(referenceTotal) !== Math.round(pcPrice);

    const lineGross = Math.max(0, pcPrice * (item.quantity || 1) - (item.discount || 0));
    const taxRate = Number(item.taxRate) || 0;
    const lineIva = taxRate > 0 ? lineGross - lineGross / (1 + taxRate / 100) : 0;

    const originBadge = (c: QuoteComponentDTO) =>
        c.origin === "distributor" ? (
            <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    distributorBadge[c.distributor || ""] || distributorBadge.elit
                }`}
            >
                {c.distributor || "DISTRIB"}
            </span>
        ) : c.origin === "manual" ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                MANUAL
            </span>
        ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TIENDA
            </span>
        );

    return (
        <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 space-y-4">
            {/* Cabecera */}
            <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    🖥️ PC Armada
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition"
                    title="Quitar PC Armada"
                >
                    ✕
                </button>
            </div>

            {/* Datos de la línea */}
            <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                <div className="col-span-2 md:col-span-5">
                    <label className="text-[11px] text-gray-400 block mb-1">Título en el presupuesto</label>
                    <input
                        type="text"
                        value={item.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Ej: PC Gamer Ryzen 5 / RTX 4060"
                        className={`${inputClass} font-medium`}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="text-[11px] text-gray-400 block mb-1">Cant. PCs</label>
                    <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => setField("quantity", Math.max(1, Number(e.target.value) || 1))}
                        className={`${inputClass} font-mono text-center`}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[11px] text-gray-400 block mb-1">Precio por PC c/IVA ($)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => setField("unitPrice", Number(e.target.value) || 0)}
                        className={`${inputClass} font-mono text-right font-semibold`}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="text-[11px] text-gray-400 block mb-1">IVA %</label>
                    <select
                        value={item.taxRate}
                        onChange={(e) => setField("taxRate", Number(e.target.value))}
                        className={`${inputClass} text-xs px-2`}
                    >
                        <option value={10.5}>10.5%</option>
                        <option value={21}>21%</option>
                        <option value={0}>0%</option>
                    </select>
                </div>
                <div className="md:col-span-1">
                    <label className="text-[11px] text-gray-400 block mb-1">Desc. ($)</label>
                    <input
                        type="number"
                        min="0"
                        value={item.discount || 0}
                        onChange={(e) => setField("discount", Math.max(0, Number(e.target.value) || 0))}
                        className={`${inputClass} font-mono text-right`}
                    />
                </div>
                <div className="col-span-2 md:col-span-2 text-right">
                    <span className="text-[11px] text-gray-400 block mb-1">Subtotal</span>
                    <span className="text-sm font-bold text-white font-mono block">
                        ${(item.subtotal || 0).toLocaleString("es-AR")}
                    </span>
                    {taxRate > 0 && (
                        <span className="text-[10px] text-gray-400 font-mono block">
                            IVA: ${Math.round(lineIva).toLocaleString("es-AR")}
                        </span>
                    )}
                </div>
            </div>

            {/* Componentes */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-300">
                        Componentes ({components.length}) · cantidades por PC
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowInternalSelector((v) => !v)}
                            className="px-2.5 py-1 rounded-lg bg-brand/20 hover:bg-brand/30 text-[11px] font-semibold text-brand border border-brand/30 transition"
                        >
                            + Tienda
                        </button>
                        <button
                            type="button"
                            onClick={onAddDistributorComponent}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-[11px] font-semibold text-blue-300 border border-blue-500/30 transition"
                        >
                            + Mayorista
                        </button>
                        <button
                            type="button"
                            onClick={addManualComponent}
                            className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-[11px] font-semibold text-yellow-300 border border-yellow-500/30 transition"
                        >
                            + Manual
                        </button>
                    </div>
                </div>

                {showInternalSelector && (
                    <div className="p-3 rounded-lg bg-gray-800/80 border border-brand/50">
                        <ProductSelector
                            value={null}
                            statusAll
                            excludeBundles
                            onChange={(prod) => {
                                if (prod) addInternalComponent(prod);
                            }}
                        />
                    </div>
                )}

                {components.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4 border border-dashed border-gray-700 rounded-lg">
                        Agregá los componentes de la PC (tienda, mayorista o manual).
                    </p>
                ) : (
                    components.map((c, ci) => {
                        const alerts = componentAlerts[ci] || [];
                        const editableName = c.origin === "manual";
                        return (
                            <div key={c.id || ci}>
                                <div
                                    className={`bg-gray-800/40 border border-gray-800 px-3 py-2 flex flex-col md:flex-row md:items-center gap-2 ${
                                        alerts.length > 0 ? "rounded-t-lg" : "rounded-lg"
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {originBadge(c)}
                                            {(c.sku || c.distributorSku) && (
                                                <span className="text-[11px] font-mono text-gray-400 truncate">
                                                    SKU: {c.sku || c.distributorSku}
                                                </span>
                                            )}
                                        </div>
                                        {editableName ? (
                                            <input
                                                type="text"
                                                value={c.name}
                                                onChange={(e) => updateComponent(ci, "name", e.target.value)}
                                                placeholder="Descripción del componente..."
                                                className={inputClass}
                                            />
                                        ) : (
                                            <p className="text-sm text-white truncate" title={c.name}>
                                                {c.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="w-16">
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Cant.</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={c.quantity}
                                                onChange={(e) =>
                                                    updateComponent(ci, "quantity", Math.max(1, Number(e.target.value) || 1))
                                                }
                                                className={`${inputClass} font-mono text-center px-1.5`}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Costo unit. ($)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={c.costPrice || 0}
                                                onChange={(e) =>
                                                    updateComponent(ci, "costPrice", Number(e.target.value) || 0)
                                                }
                                                className={`${inputClass} font-mono text-right`}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Precio ref. c/IVA</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={c.unitPrice}
                                                onChange={(e) =>
                                                    updateComponent(ci, "unitPrice", Number(e.target.value) || 0)
                                                }
                                                className={`${inputClass} font-mono text-right`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeComponent(ci)}
                                            className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition shrink-0"
                                            title="Quitar componente"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {alerts.length > 0 && (
                                    <div className="rounded-b-lg border border-t-0 border-amber-500/30 bg-amber-500/10 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                        <div className="flex-1 text-amber-300 space-y-0.5">
                                            {alerts.map((alert) => (
                                                <p key={alert.type}>⚠ {describeAlert(alert)}</p>
                                            ))}
                                            <p className="text-amber-200/60">
                                                El precio de la PC no cambia solo; revisalo después de actualizar.
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onResolveComponentAlert(ci, "refresh")}
                                                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold hover:brightness-110 transition"
                                                title="Usa el costo y el dólar actuales y mantiene el margen sobre el precio de referencia"
                                            >
                                                Actualizar costo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onResolveComponentAlert(ci, "ignore")}
                                                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
                                            >
                                                Ignorar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Resumen por PC */}
            {components.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
                        <span>
                            Suma de componentes: <strong className="text-white font-mono">{formatArs(referenceTotal)}</strong>
                        </span>
                        <span>
                            Costo: <strong className="text-white font-mono">{formatArs(costTotal)}</strong>
                            {withoutCost > 0 && (
                                <span className="text-gray-500"> ({withoutCost} sin costo)</span>
                            )}
                        </span>
                        {margin !== null && (
                            <span>
                                Margen:{" "}
                                <strong className={`font-mono ${margin >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                                    {(margin * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%
                                </strong>
                            </span>
                        )}
                    </div>
                    {priceDiffersFromSum && (
                        <button
                            type="button"
                            onClick={() => setField("unitPrice", Math.round(referenceTotal * 100) / 100)}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 font-semibold transition"
                        >
                            Usar suma como precio de la PC
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
