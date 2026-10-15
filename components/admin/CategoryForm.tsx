"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    category?: any;
    categories: CategoryDTO[];
    mode: "create" | "edit";
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

    const buildPayload = () => ({
        name: form.name.trim(),
        slug: form.slug.trim(),
        parentId: form.parentId ? form.parentId : null,
        image: image || null,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const url =
                mode === "edit"
                    ? `/api/admin/categories/${category._id}`
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
            const res = await fetch(`/api/admin/categories/${category._id}`, {
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
    const labelClass = "text-sm text-gray-400 mb-1 block";

    // Filtrar la propia categoría para no permitir seleccionarse como su propio padre
    const availableParents = categories.filter(
        (c) => !category?._id || c.id !== category._id,
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
                                placeholder="Ej: Placas de Video"
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
                                placeholder="placas-de-video (opcional, se autogenera)"
                                className={inputClass}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Si se deja vacío, se generará automáticamente a partir del nombre.
                            </p>
                        </div>
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
                            Selecciona una categoría si esta debe ser una subcategoría hija.
                        </p>
                    </div>
                </section>
            </div>
        </form>
    );
}
