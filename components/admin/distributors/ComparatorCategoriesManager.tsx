"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormModal } from "@/components/admin/FormModal";
import { CategoryValuePicker } from "@/components/admin/distributors/CategoryValuePicker";
import type {
    ComparatorCategoryDTO,
    DistributorCategoryOption,
    DistributorCategoryOptions,
    ElitCategoryMapping,
    ElitCategoryParam,
} from "@/types/shared/comparatorCategory";

interface Props {
    initialCategories: ComparatorCategoryDTO[];
    options: DistributorCategoryOptions;
}

type FormState = Omit<ComparatorCategoryDTO, "id">;

const EMPTY_FORM: FormState = {
    key: "",
    name: "",
    order: 0,
    active: true,
    elit: [],
    newbytes: [],
    invid: [],
    air: [],
};

// NewBytes usa guiones en lugar de espacios: "PLACA DE VIDEO" equivale a "PLACA-DE-VIDEO"
const normalizeNewBytes = (v: string) => v.trim().replace(/\s+/g, "-").toUpperCase();

const summary = (values: string[], options: DistributorCategoryOption[]) =>
    values
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(", ");

export function ComparatorCategoriesManager({ initialCategories, options }: Props) {
    const router = useRouter();
    const [categories, setCategories] = useState(initialCategories);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const openForm = (category?: ComparatorCategoryDTO) => {
        setError("");
        setEditingId(category?.id ?? null);
        if (category) {
            setForm({
                key: category.key,
                name: category.name,
                order: category.order,
                active: category.active,
                elit: category.elit,
                newbytes: category.newbytes,
                invid: category.invid,
                air: category.air,
            });
        } else {
            const nextOrder = Math.max(0, ...categories.map((c) => c.order)) + 10;
            setForm({ ...EMPTY_FORM, order: nextOrder });
        }
    };

    const closeForm = () => {
        setForm(null);
        setEditingId(null);
    };

    const updateElit = (index: number, patch: Partial<ElitCategoryMapping>) => {
        if (!form) return;
        setForm({
            ...form,
            elit: form.elit.map((e, i) => (i === index ? { ...e, ...patch } : e)),
        });
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(
                editingId
                    ? `/api/admin/distributors/categories/${editingId}`
                    : "/api/admin/distributors/categories",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        elit: form.elit.filter((e) => e.value.trim()),
                    }),
                },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "No se pudo guardar");

            const saved: ComparatorCategoryDTO = data.category;
            setCategories((prev) =>
                [...prev.filter((c) => c.id !== saved.id), saved].sort(
                    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
                ),
            );
            closeForm();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: ComparatorCategoryDTO) => {
        if (!confirm(`¿Eliminar la categoría "${category.name}" del comparador?`)) return;
        const res = await fetch(`/api/admin/distributors/categories/${category.id}`, {
            method: "DELETE",
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error || "No se pudo eliminar");
            return;
        }
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
        router.refresh();
    };

    const missing = (c: ComparatorCategoryDTO) =>
        [
            c.elit.length === 0 && "Elit",
            c.newbytes.length === 0 && "NewBytes",
            c.invid.length === 0 && "Invid",
            c.air.length === 0 && "AIR",
        ].filter(Boolean);

    return (
        <div className="space-y-4">
            {options.errors.length > 0 && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                    No se pudo obtener el listado de categorías de {options.errors.join(", ")}. Podés
                    escribir los valores a mano.
                </p>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => openForm()}
                    className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110 transition"
                >
                    + Nueva categoría
                </button>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800/50 border-b border-gray-800 text-gray-400">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Orden</th>
                            <th className="px-4 py-3 font-semibold">Categoría</th>
                            <th className="px-4 py-3 font-semibold">Elit</th>
                            <th className="px-4 py-3 font-semibold">NewBytes</th>
                            <th className="px-4 py-3 font-semibold">Invid</th>
                            <th className="px-4 py-3 font-semibold">AIR</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {categories.map((c) => (
                            <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                                <td className="px-4 py-3 text-gray-500">{c.order}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-white">{c.name}</div>
                                    <div className="text-xs text-gray-500 font-mono">
                                        {c.key}
                                        {!c.active && " · inactiva"}
                                    </div>
                                    {missing(c).length > 0 && (
                                        <div className="text-xs text-amber-400 mt-0.5">
                                            Sin mapeo: {missing(c).join(", ")}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-300 text-xs">
                                    {c.elit.map((e) => `${e.value} (${e.paramType})`).join(", ") || "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-300 text-xs">
                                    {c.newbytes.join(", ") || "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-300 text-xs">
                                    {summary(c.invid, options.invid) || "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-300 text-xs">
                                    {summary(c.air, options.air) || "—"}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <button
                                        type="button"
                                        onClick={() => openForm(c)}
                                        className="text-xs text-gray-300 hover:text-white underline mr-3"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(c)}
                                        className="text-xs text-red-400 hover:text-red-300 underline"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                    No hay categorías configuradas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {form && (
                <FormModal title={editingId ? `Editar ${form.name}` : "Nueva categoría"}>
                    <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <label className="sm:col-span-2 text-xs text-gray-400">
                                Nombre
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand"
                                />
                            </label>
                            <label className="text-xs text-gray-400">
                                Clave (URL)
                                <input
                                    type="text"
                                    value={form.key}
                                    onChange={(e) =>
                                        setForm({ ...form, key: e.target.value.toUpperCase() })
                                    }
                                    placeholder="VIDEO"
                                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand"
                                />
                            </label>
                            <label className="text-xs text-gray-400">
                                Orden
                                <input
                                    type="number"
                                    min={0}
                                    value={form.order}
                                    onChange={(e) =>
                                        setForm({ ...form, order: Math.max(0, Number(e.target.value) || 0) })
                                    }
                                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand"
                                />
                            </label>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                className="accent-brand"
                            />
                            Visible en el comparador
                        </label>

                        {/* ELIT: sin API de categorías, valores sugeridos a partir de búsquedas */}
                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold text-blue-400">Elit</h3>
                            <p className="text-xs text-gray-500">
                                Elit no publica su listado de categorías: las sugerencias salen de los
                                productos que fueron apareciendo en las búsquedas.
                            </p>
                            {form.elit.map((e, i) => (
                                <div key={i} className="flex gap-2">
                                    <select
                                        value={e.paramType}
                                        onChange={(ev) =>
                                            updateElit(i, { paramType: ev.target.value as ElitCategoryParam })
                                        }
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                                    >
                                        <option value="categoria">Categoría</option>
                                        <option value="sub_categoria">Subcategoría</option>
                                    </select>
                                    <input
                                        type="text"
                                        list={`elit-${e.paramType}`}
                                        value={e.value}
                                        onChange={(ev) => updateElit(i, { value: ev.target.value })}
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-brand"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm({ ...form, elit: form.elit.filter((_, j) => j !== i) })
                                        }
                                        className="px-2 text-gray-500 hover:text-white"
                                        aria-label="Quitar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <datalist id="elit-categoria">
                                {options.elit.categoria.map((o) => (
                                    <option key={o.value} value={o.value} />
                                ))}
                            </datalist>
                            <datalist id="elit-sub_categoria">
                                {options.elit.sub_categoria.map((o) => (
                                    <option key={o.value} value={o.value} />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        elit: [...form.elit, { paramType: "sub_categoria", value: "" }],
                                    })
                                }
                                className="text-xs text-gray-300 hover:text-white underline"
                            >
                                + Agregar categoría de Elit
                            </button>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold text-emerald-400">NewBytes</h3>
                            <CategoryValuePicker
                                options={options.newbytes}
                                selected={form.newbytes}
                                onChange={(newbytes) => setForm({ ...form, newbytes })}
                                normalize={normalizeNewBytes}
                                emptyMessage="No se pudo cargar el listado de NewBytes: escribí la categoría a mano."
                            />
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold text-purple-300">Invid</h3>
                            <CategoryValuePicker
                                options={options.invid}
                                selected={form.invid}
                                onChange={(invid) => setForm({ ...form, invid })}
                                emptyMessage="Todavía no hay catálogo de Invid sincronizado."
                            />
                            <p className="text-xs text-gray-500">
                                Además de los IDs, se aceptan nombres: se comparan por palabras, sin
                                plurales (ej: &quot;Mother&quot; incluye &quot;Motherboards&quot;).
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold text-orange-300">AIR</h3>
                            <CategoryValuePicker
                                options={options.air}
                                selected={form.air}
                                onChange={(air) => setForm({ ...form, air })}
                                emptyMessage="Todavía no hay lista de AIR sincronizada."
                            />
                            <p className="text-xs text-gray-500">
                                Se mapea por código de rubro (ej: 001-0331); AIR suele repetir un
                                rubro con dos códigos, conviene elegir ambos.
                            </p>
                        </section>
                    </div>

                    {error && (
                        <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 mt-5">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !form.name.trim() || !form.key.trim()}
                            className="px-5 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition"
                        >
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </FormModal>
            )}
        </div>
    );
}
