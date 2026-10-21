"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type {
    AttributeInputType,
    CategoryAttributeDefinitionDTO,
    CategoryDTO,
} from "@/types/shared/category";
import { HARDWARE_ATTRIBUTE_PRESETS } from "@/constants/hardwareAttributePresets";
import { getEffectiveCategoryAttributeDefinitions } from "@/services/categories/getEffectiveCategoryAttributes";

interface Props {
    category?: any;
    categories: CategoryDTO[];
    mode: "create" | "edit";
}

function slugifyKey(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function ImageUploader({
    image,
    onChange,
}: {
    image: string;
    onChange: (image: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File | null) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                onChange(data.url);
            }
        } catch (e) {
            console.error("Upload error:", e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleUpload(file);
                }}
            />

            {image ? (
                <div>
                    <p className="text-xs text-gray-400 mb-2">Imagen de portada</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 w-full border border-gray-700">
                        <Image
                            src={image}
                            alt="Imagen de categoría"
                            fill
                            sizes="300px"
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 text-white text-xs flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                            title="Eliminar imagen"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ) : null}

            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-brand text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                {uploading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                        <span>Subiendo...</span>
                    </>
                ) : image ? (
                    "Cambiar imagen"
                ) : (
                    "+ Subir imagen de categoría"
                )}
            </button>
        </div>
    );
}

export function CategoryForm({ category, categories, mode }: Props) {
    const router = useRouter();
    const categoryId = category?.id || category?._id || "";

    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [image, setImage] = useState<string>(category?.image || "");

    const [form, setForm] = useState({
        name: category?.name || "",
        slug: category?.slug || "",
        parentId: category?.parentId?._id || category?.parentId || "",
    });

    const [attributeDefinitions, setAttributeDefinitions] = useState<
        CategoryAttributeDefinitionDTO[]
    >(() =>
        Array.isArray(category?.attributeDefinitions)
            ? category.attributeDefinitions.map((d: any) => ({
                  key: d.key || "",
                  label: d.label || "",
                  type: d.type || "select",
                  options: Array.isArray(d.options) ? [...d.options] : [],
                  unit: d.unit || "",
                  required: Boolean(d.required),
                  filterable: d.filterable !== undefined ? Boolean(d.filterable) : true,
              }))
            : [],
    );

    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [optionInputs, setOptionInputs] = useState<Record<number, string>>({});

    // Atributos heredados de la categoría padre (si tiene parentId)
    const inheritedAttributes = useMemo(() => {
        if (!form.parentId) return [];
        return getEffectiveCategoryAttributeDefinitions([form.parentId], categories);
    }, [form.parentId, categories]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleApplyPreset = () => {
        if (!selectedPreset) return;
        const preset = HARDWARE_ATTRIBUTE_PRESETS.find(
            (p) => p.id === selectedPreset,
        );
        if (!preset) return;

        setAttributeDefinitions((prev) => {
            const next = [...prev];
            for (const presetAttr of preset.attributes) {
                const existingIdx = next.findIndex((a) => a.key === presetAttr.key);
                if (existingIdx === -1) {
                    next.push({
                        ...presetAttr,
                        options: [...(presetAttr.options || [])],
                    });
                } else {
                    const mergedOptions = Array.from(
                        new Set([
                            ...(next[existingIdx].options || []),
                            ...(presetAttr.options || []),
                        ]),
                    );
                    next[existingIdx] = {
                        ...next[existingIdx],
                        options: mergedOptions,
                        unit: next[existingIdx].unit || presetAttr.unit,
                    };
                }
            }
            return next;
        });
        setSelectedPreset("");
    };

    const handleAddAttribute = () => {
        setAttributeDefinitions((prev) => [
            ...prev,
            {
                key: "",
                label: "",
                type: "select",
                options: [],
                unit: "",
                required: false,
                filterable: true,
            },
        ]);
    };

    const handleRemoveAttribute = (index: number) => {
        setAttributeDefinitions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateAttribute = (
        index: number,
        patch: Partial<CategoryAttributeDefinitionDTO>,
    ) => {
        setAttributeDefinitions((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, ...patch };
                // Si se actualiza el label y el key estaba vacío o coincidía con el slug del label anterior, autogenerar key
                if (
                    patch.label !== undefined &&
                    (!item.key || item.key === slugifyKey(item.label))
                ) {
                    updated.key = slugifyKey(patch.label);
                }
                return updated;
            }),
        );
    };

    const handleAddOptions = (index: number) => {
        const raw = optionInputs[index] || "";
        if (!raw.trim()) return;
        const newOpts = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!newOpts.length) return;

        setAttributeDefinitions((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const merged = Array.from(
                    new Set([...(item.options || []), ...newOpts]),
                );
                return { ...item, options: merged };
            }),
        );
        setOptionInputs((prev) => ({ ...prev, [index]: "" }));
    };

    const handleRemoveOption = (attrIndex: number, optToRemove: string) => {
        setAttributeDefinitions((prev) =>
            prev.map((item, i) => {
                if (i !== attrIndex) return item;
                return {
                    ...item,
                    options: (item.options || []).filter((o) => o !== optToRemove),
                };
            }),
        );
    };

    const buildPayload = () => ({
        name: form.name.trim(),
        slug: form.slug.trim(),
        parentId: form.parentId ? form.parentId : null,
        image: image || null,
        attributeDefinitions: attributeDefinitions
            .filter((a) => a.key.trim() && a.label.trim())
            .map((a) => ({
                key: slugifyKey(a.key),
                label: a.label.trim(),
                type: a.type,
                options:
                    a.type === "select" || a.type === "multiselect"
                        ? a.options
                        : [],
                unit: a.type === "number" ? (a.unit || "").trim() : "",
                required: Boolean(a.required),
                filterable: Boolean(a.filterable),
            })),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const url =
                mode === "edit"
                    ? `/api/admin/categories/${categoryId}`
                    : "/api/admin/categories";
            const res = await fetch(url, {
                method: mode === "edit" ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildPayload()),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al guardar");

            setSuccess(
                mode === "edit"
                    ? "Categoría actualizada correctamente"
                    : "Categoría creada con éxito",
            );

            if (mode === "create" && data._id) {
                router.push(`/admin/categories/${data._id}`);
            } else {
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || "Error al guardar la categoría");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                "¿Estás seguro que querés eliminar esta categoría? Esta acción no se puede deshacer.",
            )
        ) {
            return;
        }

        setDeleting(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al eliminar la categoría");
            }
            router.push("/admin/categories");
        } catch (e: any) {
            setError(e.message || "No se pudo eliminar la categoría");
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const smallInputClass =
        "w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    // Filtrar la propia categoría para no permitir seleccionarse como su propio padre
    const availableParents = categories.filter(
        (c) => !categoryId || c.id !== categoryId,
    );

    return (
        <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            {/* Columna principal */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Info básica */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Información básica
                    </h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className={labelClass}>
                                Nombre de la categoría *
                            </label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Ej: Procesadores"
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Slug (URL personalizada)
                            </label>
                            <input
                                name="slug"
                                value={form.slug}
                                onChange={handleChange}
                                placeholder="procesadores (opcional, se autogenera)"
                                className={inputClass}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Si se deja vacío, se generará automáticamente a partir del nombre.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Atributos de la Categoría (Especificaciones y Armá tu PC) */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Atributos de la Categoría
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Define las especificaciones técnicas de los productos de esta categoría y las claves de compatibilidad para &ldquo;Armá tu PC&rdquo;.
                            </p>
                        </div>
                    </div>

                    {/* Selector de Plantilla de Hardware */}
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/70 mb-5">
                        <label className="text-xs font-medium text-gray-300 block mb-2">
                            ⚡ Cargar plantilla estandarizada para &ldquo;Armá tu PC&rdquo;
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                className={smallInputClass}
                            >
                                <option value="">
                                    Seleccionar tipo de componente...
                                </option>
                                {HARDWARE_ATTRIBUTE_PRESETS.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.name} — ({preset.description})
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleApplyPreset}
                                disabled={!selectedPreset}
                                className="px-4 py-2 rounded-lg bg-brand/20 text-brand border border-brand/30 text-xs font-semibold hover:bg-brand hover:text-white disabled:opacity-40 transition-all shrink-0"
                            >
                                Cargar plantilla
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            Las plantillas usan claves técnicas estandarizadas (<code className="text-gray-300">socket</code>, <code className="text-gray-300">ram_type</code>, <code className="text-gray-300">ram_slots</code>, <code className="text-gray-300">form_factor</code>, <code className="text-gray-300">tdp</code>, <code className="text-gray-300">watts</code>) para cruzar compatibilidad automáticamente entre componentes.
                        </p>
                    </div>

                    {/* Atributos heredados de la categoría padre */}
                    {inheritedAttributes.length > 0 && (
                        <div className="mb-5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs font-medium text-blue-300 mb-2">
                                ↳ Atributos heredados automáticamente de la categoría superior:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {inheritedAttributes.map((attr) => (
                                    <span
                                        key={attr.key}
                                        className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30"
                                    >
                                        {attr.label}{" "}
                                        <span className="text-[10px] text-blue-300/80 font-mono">
                                            ({attr.key})
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de atributos propios */}
                    <div className="flex flex-col gap-4">
                        {attributeDefinitions.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
                                Esta categoría aún no tiene atributos propios definidos.
                                <br />
                                <span className="text-xs">
                                    Cargá una plantilla arriba o agregá un atributo personalizado.
                                </span>
                            </div>
                        ) : (
                            attributeDefinitions.map((attr, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/80 flex flex-col gap-3"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                        {/* Nombre visible */}
                                        <div className="sm:col-span-4">
                                            <label className="text-[11px] text-gray-400 block mb-1">
                                                Nombre visible *
                                            </label>
                                            <input
                                                type="text"
                                                value={attr.label}
                                                onChange={(e) =>
                                                    handleUpdateAttribute(idx, {
                                                        label: e.target.value,
                                                    })
                                                }
                                                placeholder="Ej: Socket"
                                                className={smallInputClass}
                                            />
                                        </div>

                                        {/* Clave técnica */}
                                        <div className="sm:col-span-3">
                                            <label className="text-[11px] text-gray-400 block mb-1">
                                                Clave técnica (ID) *
                                            </label>
                                            <input
                                                type="text"
                                                value={attr.key}
                                                onChange={(e) =>
                                                    handleUpdateAttribute(idx, {
                                                        key: slugifyKey(
                                                            e.target.value,
                                                        ),
                                                    })
                                                }
                                                placeholder="ej: socket"
                                                className={`${smallInputClass} font-mono`}
                                            />
                                        </div>

                                        {/* Tipo de dato */}
                                        <div className="sm:col-span-3">
                                            <label className="text-[11px] text-gray-400 block mb-1">
                                                Tipo de campo
                                            </label>
                                            <select
                                                value={attr.type}
                                                onChange={(e) =>
                                                    handleUpdateAttribute(idx, {
                                                        type: e.target
                                                            .value as AttributeInputType,
                                                    })
                                                }
                                                className={smallInputClass}
                                            >
                                                <option value="select">
                                                    Selector único (Ej: Socket)
                                                </option>
                                                <option value="multiselect">
                                                    Selector múltiple (Ej: Sockets compatibles)
                                                </option>
                                                <option value="number">
                                                    Numérico (Ej: Slots RAM, Watts)
                                                </option>
                                                <option value="boolean">
                                                    Sí / No (Ej: Incluye Cooler)
                                                </option>
                                                <option value="text">
                                                    Texto libre
                                                </option>
                                            </select>
                                        </div>

                                        {/* Unidad (si es numérico) o acciones */}
                                        <div className="sm:col-span-2 flex items-end justify-between gap-2 pt-5">
                                            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={attr.required}
                                                    onChange={(e) =>
                                                        handleUpdateAttribute(
                                                            idx,
                                                            {
                                                                required:
                                                                    e.target
                                                                        .checked,
                                                            },
                                                        )
                                                    }
                                                    className="rounded border-gray-600 bg-gray-700 text-brand focus:ring-brand"
                                                />
                                                <span>Oblig.</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveAttribute(idx)
                                                }
                                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                                                title="Eliminar atributo"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unidad para campos numéricos */}
                                    {attr.type === "number" && (
                                        <div className="flex items-center gap-3 pt-1">
                                            <label className="text-xs text-gray-400 shrink-0">
                                                Unidad de medida (opcional):
                                            </label>
                                            <input
                                                type="text"
                                                value={attr.unit || ""}
                                                onChange={(e) =>
                                                    handleUpdateAttribute(idx, {
                                                        unit: e.target.value,
                                                    })
                                                }
                                                placeholder="Ej: W, GB, MHz, slots, mm"
                                                className={`${smallInputClass} max-w-[200px]`}
                                            />
                                        </div>
                                    )}

                                    {/* Opciones sugeridas para select y multiselect */}
                                    {(attr.type === "select" ||
                                        attr.type === "multiselect") && (
                                        <div className="pt-1">
                                            <label className="text-[11px] text-gray-400 block mb-1.5">
                                                Opciones predefinidas (podés separar varias por coma):
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {(attr.options || []).length ===
                                                0 ? (
                                                    <span className="text-xs text-gray-500 italic">
                                                        Sin opciones cargadas
                                                    </span>
                                                ) : (
                                                    (attr.options || []).map(
                                                        (opt) => (
                                                            <span
                                                                key={opt}
                                                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-900 text-gray-200 border border-gray-700"
                                                            >
                                                                {opt}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveOption(
                                                                            idx,
                                                                            opt,
                                                                        )
                                                                    }
                                                                    className="text-gray-500 hover:text-red-400"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={
                                                        optionInputs[idx] || ""
                                                    }
                                                    onChange={(e) =>
                                                        setOptionInputs(
                                                            (prev) => ({
                                                                ...prev,
                                                                [idx]: e.target
                                                                    .value,
                                                            }),
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAddOptions(
                                                                idx,
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Ej: AM4, AM5, LGA1700 (Enter para agregar)"
                                                    className={smallInputClass}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAddOptions(idx)
                                                    }
                                                    className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium shrink-0 transition-colors"
                                                >
                                                    + Agregar opción
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        <button
                            type="button"
                            onClick={handleAddAttribute}
                            className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-brand text-xs font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            + Agregar atributo personalizado
                        </button>
                    </div>
                </section>

                {/* Imagen */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Imagen descriptiva
                    </h2>
                    <ImageUploader image={image} onChange={setImage} />
                </section>
            </div>

            {/* Columna lateral */}
            <div className="flex flex-col gap-4">
                {/* Acciones de Guardar / Eliminar */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Acciones
                    </h2>
                    <div className="flex flex-col gap-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : mode === "edit" ? (
                                "Guardar cambios"
                            ) : (
                                "Crear categoría"
                            )}
                        </button>

                        {mode === "edit" && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="w-full py-2.5 rounded-xl text-red-400 text-sm font-medium border border-red-400/20 hover:bg-red-400/10 disabled:opacity-50 transition-all"
                            >
                                {deleting ? "Eliminando..." : "Eliminar categoría"}
                            </button>
                        )}

                        {mode === "edit" && category?.slug && (
                            <a
                                href={`/productos/categoria/${category.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 rounded-xl text-gray-400 text-sm text-center hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                Ver en tienda →
                            </a>
                        )}
                    </div>
                </section>

                {/* Categoría Padre */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Jerarquía
                    </h2>
                    <div>
                        <label className={labelClass}>Categoría superior</label>
                        <select
                            name="parentId"
                            value={form.parentId}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="">Ninguna (Categoría principal)</option>
                            {availableParents.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Selecciona una categoría si esta debe ser una subcategoría hija. Heredará automáticamente los atributos de su categoría superior.
                        </p>
                    </div>
                </section>
            </div>
        </form>
    );
}
