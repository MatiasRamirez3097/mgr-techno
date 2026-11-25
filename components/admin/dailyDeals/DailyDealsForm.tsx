"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/components/admin/ui/FormSection";
import { buttonClass, hintClass, inputClass, labelClass, selectClass } from "@/components/admin/ui/styles";
import { DISTRIBUTOR_LABELS } from "@/lib/distributors/productLinks";
import { marginAfterDiscount } from "@/lib/dailyDeals/selection";
import { addDays } from "@/lib/dailyDeals/window";
import { describeDealResult } from "./TodayDealPanel";
import { DISTRIBUTOR_KEYS, type DistributorKey } from "@/types/shared/distributorLink";
import type {
    DailyDealDiscountTier,
    DailyDealExclusionReason,
    DailyDealGroupDTO,
    DailyDealPreviewResult,
    DailyDealSettingsDTO,
} from "@/types/shared/dailyDeals";

interface Option {
    id: string;
    name: string;
    depth?: number;
}

interface Props {
    initialSettings: DailyDealSettingsDTO;
    categories: Option[];
    brands: Option[];
    roundingStep: number;
    // Hoy en Argentina (YYYY-MM-DD)
    today: string;
}

const EXCLUSION_LABELS: Record<DailyDealExclusionReason, string> = {
    on_sale: "ya tienen precio de oferta",
    no_cost: "sin costo conocido (sin vincular a un distribuidor)",
    no_stock: "sin stock en el distribuidor",
    low_margin: "por debajo de la utilidad del escalón más bajo",
    no_deal_price: "sin precio de oferta válido",
};

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
const newGroupId = () => `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Lista de valores elegidos como etiquetas, con un desplegable para agregar más */
function ChipPicker({
    label,
    options,
    selected,
    onChange,
    emptyText,
}: {
    label: string;
    options: Option[];
    selected: string[];
    onChange: (ids: string[]) => void;
    emptyText: string;
}) {
    const names = new Map(options.map((o) => [o.id, o.name]));
    const available = options.filter((o) => !selected.includes(o.id));
    return (
        <div>
            <span className={labelClass}>{label}</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {selected.length === 0 && <span className="text-xs text-gray-500">{emptyText}</span>}
                {selected.map((id) => (
                    <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-800 border border-gray-700 px-2.5 py-1 text-xs text-gray-200"
                    >
                        {names.get(id) ?? "(eliminada)"}
                        <button
                            type="button"
                            onClick={() => onChange(selected.filter((s) => s !== id))}
                            className="text-gray-400 hover:text-white"
                            aria-label={`Quitar ${names.get(id) ?? id}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <select
                value=""
                onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
                className={selectClass}
                aria-label={`Agregar ${label.toLowerCase()}`}
            >
                <option value="">Agregar…</option>
                {available.map((o) => (
                    <option key={o.id} value={o.id}>
                        {"  ".repeat(o.depth ?? 0)}
                        {o.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function DailyDealsForm({ initialSettings, categories, brands, roundingStep, today }: Props) {
    const router = useRouter();
    const [settings, setSettings] = useState<DailyDealSettingsDTO>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [preview, setPreview] = useState<DailyDealPreviewResult | null>(null);

    const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);
    // Ya corriendo (activadas y sin inicio pendiente): no se ofrece programar el inicio
    const alreadyRunning = initialSettings.enabled && initialSettings.startDate === null;
    const tomorrow = addDays(today, 1);
    // Escalones en orden de utilidad (se editan en su posición original, que es el índice)
    const tierRows = settings.discountTiers
        .map((tier, index) => ({ tier, index, worst: marginAfterDiscount(tier.minMarginPercent, tier.discountPercent) }))
        .sort((a, b) => a.tier.minMarginPercent - b.tier.minMarginPercent)
        .map((row, i, rows) => ({ ...row, upTo: rows[i + 1]?.tier.minMarginPercent ?? null }));
    const tiersError = tierRows.some((r) => r.worst < 0)
        ? "Un escalón deja productos por debajo del costo: subí su utilidad mínima o bajá su descuento."
        : new Set(settings.discountTiers.map((t) => t.minMarginPercent)).size !== settings.discountTiers.length
          ? "Hay dos escalones con la misma utilidad mínima."
          : null;

    const set = <K extends keyof DailyDealSettingsDTO>(key: K, value: DailyDealSettingsDTO[K]) =>
        setSettings((s) => ({ ...s, [key]: value }));
    const toNumber = (value: string) => (value === "" ? 0 : Number(value));
    const setNumber = (key: "productCount" | "noRepeatDays", value: string) => set(key, toNumber(value));

    const updateTier = (index: number, patch: Partial<DailyDealDiscountTier>) =>
        set(
            "discountTiers",
            settings.discountTiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
        );
    const removeTier = (index: number) =>
        set(
            "discountTiers",
            settings.discountTiers.filter((_, i) => i !== index),
        );
    const addTier = () => {
        // Un escalón más arriba que el último, con más descuento
        const top = settings.discountTiers.reduce((a, b) => (b.minMarginPercent > a.minMarginPercent ? b : a));
        set("discountTiers", [
            ...settings.discountTiers,
            { minMarginPercent: top.minMarginPercent + 10, discountPercent: Math.min(90, top.discountPercent + 5) },
        ]);
    };

    const updateGroup = (id: string, patch: Partial<DailyDealGroupDTO>) =>
        set(
            "groups",
            settings.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        );
    const moveGroup = (index: number, delta: number) => {
        const groups = [...settings.groups];
        const [group] = groups.splice(index, 1);
        groups.splice(index + delta, 0, group);
        set("groups", groups);
    };
    const addGroup = (onlyRotation = false) =>
        set("groups", [
            ...settings.groups,
            {
                id: newGroupId(),
                name: onlyRotation ? "Stock a rotar" : `Grupo ${settings.groups.length + 1}`,
                distributors: [],
                categoryIds: [],
                brandIds: [],
                onlyRotation,
                maxProducts: null,
            },
        ]);

    async function send(url: string, method: "PUT" | "POST") {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error");
        return data;
    }

    async function handleSave() {
        setSaving(true);
        setMessage(null);
        try {
            const data = await send("/api/admin/daily-deals/settings", "PUT");
            setSettings(data.settings);
            const extra = data.generated
                ? ` ${describeDealResult(data.generated)}`
                : data.cancelled
                  ? " Se canceló la oferta de hoy."
                  : data.settings.enabled && data.settings.startDate
                    ? ` Las ofertas empiezan el ${data.settings.startDate.split("-").reverse().join("/")} a las 00:00.`
                    : "";
            setMessage({ type: "success", text: `Configuración guardada.${extra}` });
            router.refresh();
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Error guardando" });
        } finally {
            setSaving(false);
        }
    }

    async function handlePreview() {
        setPreviewing(true);
        setMessage(null);
        try {
            const data = await send("/api/admin/daily-deals/preview", "POST");
            setPreview(data.preview);
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Error simulando" });
        } finally {
            setPreviewing(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <FormSection title="Estado">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => set("enabled", e.target.checked)}
                        className="mt-1 h-5 w-5 accent-brand"
                    />
                    <span>
                        <span className="block text-sm text-gray-200">Generar ofertas del día automáticamente</span>
                        <span className="block text-sm text-gray-400 mt-0.5">
                            Al activarlo empiezan ahora o el día que elijas; al desactivarlo se cancela la oferta de
                            hoy y los productos vuelven a su precio normal. Los demás cambios valen desde el próximo
                            sorteo.
                        </span>
                    </span>
                </label>
                {settings.enabled && !alreadyRunning && (
                    <div className="mt-4 ml-8 flex flex-col gap-2 text-sm text-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="dd-start"
                                checked={settings.startDate === null}
                                onChange={() => set("startDate", null)}
                                className="accent-brand"
                            />
                            Empezar ahora (se genera la oferta de hoy al guardar)
                        </label>
                        <label className="flex flex-wrap items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="dd-start"
                                checked={settings.startDate !== null}
                                onChange={() => set("startDate", settings.startDate ?? tomorrow)}
                                className="accent-brand"
                            />
                            Empezar el día
                            <input
                                type="date"
                                min={tomorrow}
                                value={settings.startDate ?? tomorrow}
                                onChange={(e) => set("startDate", e.target.value || tomorrow)}
                                onFocus={() => settings.startDate === null && set("startDate", tomorrow)}
                                className={`${inputClass} w-auto`}
                                aria-label="Día de inicio"
                            />
                            <span className="text-gray-400">a las 00:00</span>
                        </label>
                    </div>
                )}
            </FormSection>

            <FormSection title="Parámetros">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <div>
                        <label className={labelClass} htmlFor="dd-count">
                            Productos por día
                        </label>
                        <input
                            id="dd-count"
                            type="number"
                            min={1}
                            max={50}
                            value={settings.productCount}
                            onChange={(e) => setNumber("productCount", e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="dd-norepeat">
                            Días sin repetir
                        </label>
                        <input
                            id="dd-norepeat"
                            type="number"
                            min={0}
                            max={60}
                            value={settings.noRepeatDays}
                            onChange={(e) => setNumber("noRepeatDays", e.target.value)}
                            className={inputClass}
                        />
                        <p className={hintClass}>Sólo se repiten si no alcanzan los productos.</p>
                    </div>
                </div>

                <div className="mt-5">
                    <span className={labelClass}>Descuento según la utilidad</span>
                    <p className={hintClass}>
                        La utilidad se mide sobre el costo, antes del descuento. Cada producto lleva el descuento del
                        escalón más alto que alcanza; los que no llegan al más bajo no participan. El precio de oferta se
                        redondea hacia abajo de a {money(roundingStep)}.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                        {tierRows.map(({ tier, index, worst, upTo }) => (
                            <div
                                key={index}
                                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                    worst < 0 ? "border-red-500/40 bg-red-500/10" : "border-gray-700 bg-gray-800/40"
                                }`}
                            >
                                <span className="text-gray-400">Con utilidad desde</span>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={tier.minMarginPercent}
                                    onChange={(e) => updateTier(index, { minMarginPercent: toNumber(e.target.value) })}
                                    className={`${inputClass} w-24`}
                                    aria-label={`Utilidad mínima del escalón ${index + 1}`}
                                />
                                <span className="text-gray-400">
                                    %{upTo !== null && ` (hasta ${pct(upTo)})`}, descuento de
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    step="0.5"
                                    value={tier.discountPercent}
                                    onChange={(e) => updateTier(index, { discountPercent: toNumber(e.target.value) })}
                                    className={`${inputClass} w-24`}
                                    aria-label={`Descuento del escalón ${index + 1}`}
                                />
                                <span className="text-gray-400">%</span>
                                <span className={`ml-auto text-xs ${worst < 0 ? "text-red-300" : "text-gray-400"}`}>
                                    utilidad resultante desde <strong className="text-white">{pct(worst)}</strong>
                                    {worst < 0 && " (quedaría bajo el costo)"}
                                </span>
                                {settings.discountTiers.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTier(index)}
                                        className="text-xs text-gray-400 hover:text-red-400"
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {settings.discountTiers.length < 10 && (
                        <button type="button" onClick={addTier} className={`${buttonClass.secondary} mt-2`}>
                            Agregar escalón
                        </button>
                    )}
                    {tiersError && <p className="mt-2 text-sm text-red-300">{tiersError}</p>}
                </div>

                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.requireDistributorStock}
                        onChange={(e) => set("requireDistributorStock", e.target.checked)}
                        className="mt-1 h-5 w-5 accent-brand"
                    />
                    <span>
                        <span className="block text-sm text-gray-200">Exigir stock en el distribuidor</span>
                        <span className="block text-sm text-gray-400 mt-0.5">
                            {settings.requireDistributorStock
                                ? "Sólo participan productos con stock en un distribuidor vinculado (PCMODD, que no informa stock, cuenta como con stock)."
                                : "Participan también productos sin stock en el distribuidor, con su último costo conocido."}
                        </span>
                        {!settings.requireDistributorStock && (
                            <span className="block text-xs text-amber-300 mt-1">
                                Ojo: sin stock, el costo puede estar desactualizado y no se sabe el costo de reposición.
                            </span>
                        )}
                    </span>
                </label>

                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.prioritizeRotation}
                        onChange={(e) => set("prioritizeRotation", e.target.checked)}
                        className="mt-1 h-5 w-5 accent-brand"
                    />
                    <span>
                        <span className="block text-sm text-gray-200">Priorizar stock a rotar</span>
                        <span className="block text-sm text-gray-400 mt-0.5">
                            Dentro de cada grupo salen primero los productos de{" "}
                            <a href="/admin/inventory/rotation" className="text-brand hover:underline">
                                Stock a rotar
                            </a>{" "}
                            que cumplan el margen y el stock pedidos; el resto completa los lugares.
                        </span>
                    </span>
                </label>
            </FormSection>

            <FormSection
                title="Grupos de productos"
                description="Dentro de un grupo los filtros se cruzan (el producto tiene que cumplir todos); entre grupos se suman. Se llenan en orden, cada uno hasta su cupo, y si a uno le faltan productos los lugares pasan al siguiente. Sin grupos participa todo el catálogo."
                headerActions={
                    <>
                        <button type="button" onClick={() => addGroup(true)} className={buttonClass.secondary}>
                            + Grupo de stock a rotar
                        </button>
                        <button type="button" onClick={() => addGroup()} className={buttonClass.secondary}>
                            + Agregar grupo
                        </button>
                    </>
                }
            >
                {settings.groups.length === 0 && (
                    <p className="text-sm text-gray-400">Sin grupos: participan todos los productos que cumplan utilidad y stock.</p>
                )}
                <div className="flex flex-col gap-4">
                    {settings.groups.map((group, index) => (
                        <div key={group.id} className="rounded-xl border border-gray-700 bg-gray-800/30 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
                                <span className="text-xs font-bold text-gray-400 sm:mb-3">#{index + 1}</span>
                                <div className="flex-1">
                                    <label className={labelClass}>Nombre</label>
                                    <input
                                        value={group.name}
                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                        className={inputClass}
                                        maxLength={60}
                                    />
                                </div>
                                <div className="sm:w-40">
                                    <label className={labelClass}>Cupo (opcional)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={group.maxProducts ?? ""}
                                        placeholder="Sin límite"
                                        onChange={(e) =>
                                            updateGroup(group.id, {
                                                maxProducts: e.target.value === "" ? null : Number(e.target.value),
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => moveGroup(index, -1)}
                                        className={buttonClass.ghost}
                                        aria-label="Subir prioridad"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === settings.groups.length - 1}
                                        onClick={() => moveGroup(index, 1)}
                                        className={buttonClass.ghost}
                                        aria-label="Bajar prioridad"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => set("groups", settings.groups.filter((g) => g.id !== group.id))}
                                        className={buttonClass.danger}
                                    >
                                        Quitar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div>
                                    <span className={labelClass}>Proveedores</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DISTRIBUTOR_KEYS.map((d: DistributorKey) => {
                                            const active = group.distributors.includes(d);
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() =>
                                                        updateGroup(group.id, {
                                                            distributors: active
                                                                ? group.distributors.filter((x) => x !== d)
                                                                : [...group.distributors, d],
                                                        })
                                                    }
                                                    className={`rounded-full px-3 py-1 text-xs border transition ${
                                                        active
                                                            ? "bg-brand/20 border-brand text-white"
                                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                                                    }`}
                                                    aria-pressed={active}
                                                >
                                                    {DISTRIBUTOR_LABELS[d]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className={hintClass}>
                                        {group.distributors.length === 0 ? "Cualquier proveedor." : "Alguno de los marcados."}
                                    </p>
                                </div>
                                <ChipPicker
                                    label="Categorías"
                                    options={categories}
                                    selected={group.categoryIds}
                                    onChange={(categoryIds) => updateGroup(group.id, { categoryIds })}
                                    emptyText="Cualquier categoría (incluye subcategorías)."
                                />
                                <ChipPicker
                                    label="Marcas"
                                    options={brands}
                                    selected={group.brandIds}
                                    onChange={(brandIds) => updateGroup(group.id, { brandIds })}
                                    emptyText="Cualquier marca."
                                />
                            </div>

                            <label className="mt-4 flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={group.onlyRotation}
                                    onChange={(e) => updateGroup(group.id, { onlyRotation: e.target.checked })}
                                    className="mt-1 h-5 w-5 accent-brand"
                                />
                                <span>
                                    <span className="block text-sm text-gray-200">Sólo stock a rotar</span>
                                    <span className="block text-sm text-gray-400 mt-0.5">
                                        Participan sólo los productos de{" "}
                                        <a href="/admin/inventory/rotation" className="text-brand hover:underline">
                                            Stock a rotar
                                        </a>{" "}
                                        que además cumplan la utilidad y el stock pedidos. Se cruza con los demás
                                        filtros del grupo.
                                    </span>
                                </span>
                            </label>
                        </div>
                    ))}
                </div>
            </FormSection>

            {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>{message.text}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving || tiersError !== null}
                    className={buttonClass.primary}
                >
                    {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" onClick={handlePreview} disabled={previewing} className={buttonClass.secondary}>
                    {previewing ? "Simulando…" : "Simular sorteo de hoy"}
                </button>
            </div>

            {preview && <PreviewPanel preview={preview} />}
        </div>
    );
}

function PreviewPanel({ preview }: { preview: DailyDealPreviewResult }) {
    const exclusions = (Object.entries(preview.excluded) as [DailyDealExclusionReason, number][]).filter(([, n]) => n > 0);
    return (
        <FormSection
            title={`Simulación del ${preview.date.split("-").reverse().join("/")}`}
            description="Es un sorteo de prueba con la configuración del formulario: no cambia precios ni queda guardado. Cada simulación sale distinta."
        >
            <div className="text-sm text-gray-300 space-y-1 mb-4">
                <p>
                    {preview.eligible} de {preview.evaluated} productos visibles en la tienda pueden participar.
                </p>
                {exclusions.length > 0 && (
                    <p className="text-gray-400">
                        Quedan afuera: {exclusions.map(([reason, n]) => `${n} ${EXCLUSION_LABELS[reason]}`).join(" · ")}.
                    </p>
                )}
                {preview.shortfall > 0 && (
                    <p className="text-amber-300">
                        Faltaron {preview.shortfall} productos para llegar a la cantidad pedida.
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {preview.groups.map((g) => (
                    <span key={g.groupId} className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs text-gray-300">
                        <strong className="text-white">{g.groupName}</strong>: {g.picked} elegidos · {g.matching} cumplen ·{" "}
                        {g.fresh} sin repetir
                    </span>
                ))}
            </div>

            {preview.items.length === 0 ? (
                <p className="text-sm text-gray-400">Ningún producto cumple las condiciones.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-gray-800">
                                <th className="py-2 pr-3 font-medium">Producto</th>
                                <th className="py-2 pr-3 font-medium">Grupo</th>
                                <th className="py-2 pr-3 font-medium text-right">Precio</th>
                                <th className="py-2 pr-3 font-medium text-right">Costo</th>
                                <th className="py-2 font-medium text-right">Utilidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.items.map((item) => (
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
                                        {item.rotation && (
                                            <span className="ml-2 rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">
                                                a rotar
                                            </span>
                                        )}
                                        {item.repeated && (
                                            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                                                repetido (salió el {item.lastFeaturedOn?.split("-").reverse().join("/")})
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3 text-gray-400">{item.groupName}</td>
                                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                                        <span className="text-gray-500 line-through mr-1">{money(item.regularPrice)}</span>
                                        <span className="text-white font-semibold">{money(item.dealPrice)}</span>
                                        <span className="block text-[11px] text-brand">-{pct(item.discountPercent)}</span>
                                    </td>
                                    <td className="py-2 pr-3 text-right whitespace-nowrap text-gray-300">
                                        {money(item.cost)}
                                        <span className="block text-[11px] text-gray-500">
                                            {DISTRIBUTOR_LABELS[item.costDistributor]}
                                            {item.costWithoutStock && " · sin stock"}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right whitespace-nowrap">
                                        <span className="text-gray-400">{pct(item.marginPercent)}</span>
                                        <span className="text-gray-500"> → </span>
                                        <span className="text-white font-semibold">{pct(item.dealMarginPercent)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </FormSection>
    );
}
