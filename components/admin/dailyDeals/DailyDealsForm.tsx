"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/components/admin/ui/FormSection";
import { buttonClass, hintClass, inputClass, labelClass, selectClass } from "@/components/admin/ui/styles";
import { DISTRIBUTOR_LABELS } from "@/lib/distributors/productLinks";
import { marginAfterDiscount } from "@/lib/dailyDeals/selection";
import { describeDealResult } from "./TodayDealPanel";
import { DISTRIBUTOR_KEYS, type DistributorKey } from "@/types/shared/distributorLink";
import type {
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
}

const EXCLUSION_LABELS: Record<DailyDealExclusionReason, string> = {
    on_sale: "ya tienen precio de oferta",
    no_cost: "sin costo conocido (sin vincular a un distribuidor)",
    no_stock: "sin stock en el distribuidor",
    low_margin: "por debajo de la utilidad mínima",
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

export function DailyDealsForm({ initialSettings, categories, brands, roundingStep }: Props) {
    const router = useRouter();
    const [settings, setSettings] = useState<DailyDealSettingsDTO>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [preview, setPreview] = useState<DailyDealPreviewResult | null>(null);

    const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);
    const worstMargin = marginAfterDiscount(settings.minMarginPercent, settings.discountPercent);

    const set = <K extends keyof DailyDealSettingsDTO>(key: K, value: DailyDealSettingsDTO[K]) =>
        setSettings((s) => ({ ...s, [key]: value }));
    const setNumber = (key: "productCount" | "noRepeatDays" | "minMarginPercent" | "discountPercent", value: string) =>
        set(key, value === "" ? 0 : Number(value));

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
    const addGroup = () =>
        set("groups", [
            ...settings.groups,
            {
                id: newGroupId(),
                name: `Grupo ${settings.groups.length + 1}`,
                distributors: [],
                categoryIds: [],
                brandIds: [],
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
                            Al activarlo se genera la oferta de hoy en el momento; al desactivarlo se cancela y los
                            productos vuelven a su precio normal. Los demás cambios valen desde el próximo sorteo.
                        </span>
                    </span>
                </label>
            </FormSection>

            <FormSection title="Parámetros">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div>
                        <label className={labelClass} htmlFor="dd-margin">
                            Utilidad mínima antes del descuento (%)
                        </label>
                        <input
                            id="dd-margin"
                            type="number"
                            min={0}
                            step="0.5"
                            value={settings.minMarginPercent}
                            onChange={(e) => setNumber("minMarginPercent", e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="dd-discount">
                            Descuento (%)
                        </label>
                        <input
                            id="dd-discount"
                            type="number"
                            min={1}
                            max={90}
                            step="0.5"
                            value={settings.discountPercent}
                            onChange={(e) => setNumber("discountPercent", e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <p
                    className={`mt-4 text-sm rounded-lg border px-3 py-2 ${
                        worstMargin < 0
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-gray-700 bg-gray-800/50 text-gray-300"
                    }`}
                >
                    Utilidad resultante: un producto que justo tiene {pct(settings.minMarginPercent)} queda con{" "}
                    <strong>{pct(worstMargin)}</strong> después del {pct(settings.discountPercent)} de descuento (los que
                    tienen más utilidad quedan con más). El precio de oferta se redondea hacia abajo de a{" "}
                    {money(roundingStep)}.
                    {worstMargin < 0 && " Así algunos productos quedarían por debajo del costo: no se puede guardar."}
                </p>

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
            </FormSection>

            <FormSection
                title="Grupos de productos"
                description="Dentro de un grupo los filtros se cruzan (el producto tiene que cumplir todos); entre grupos se suman. Se llenan en orden, cada uno hasta su cupo, y si a uno le faltan productos los lugares pasan al siguiente. Sin grupos participa todo el catálogo."
                headerActions={
                    <button type="button" onClick={addGroup} className={buttonClass.secondary}>
                        + Agregar grupo
                    </button>
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
                    disabled={!dirty || saving || worstMargin < 0}
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
