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
            let uploaded: string = "";
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.url) uploaded = data.url;

            onChange(image);
        } catch (e) {
            console.log(">>> upload error:", e);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        onChange(image);
    };

    const handleSetMain = (index: number) => {
        if (index === 0) return;
        const newImage = image;
        onChange(newImage);
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Imagen principal */}
            <div>
                <p className="text-xs text-gray-400 mb-2">Imagen principal</p>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 w-full">
                    <Image
                        src={image}
                        alt="Imagen principal"
                        fill
                        sizes="300px"
                        className="object-cover"
                    />
                    <button
                        type="button"
                        onClick={() => handleRemove(0)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Botón subida */}
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-brand text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-all"
            >
                {uploading
                    ? "Subiendo..."
                    : image != ""
                      ? "Subir imágen"
                      : "+ Agregar más imágenes"}
            </button>
        </div>
    );
}
/*
<input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.file)}
            />
*/
export function CategoryForm({ category, categories, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [image, setImage] = useState<string[]>(category?.image || "");

    const [form, setForm] = useState({
        name: category?.name || "",
        slug: category?.slug || "",
        parentId: category?.parentId || null,
    });

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const buildPayload = () => ({
        name: form.name,
        slug: form.slug,
        parentId: form.parentId != "" ? form.parentId : null,
        image: image,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/categories/${category._id}`
                    : "/api/admin/categories",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") router.push(`/admin/category/${data._id}`);
            else router.refresh();
        } catch (e: any) {
            setError(e.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                "¿Estás seguro que querés eliminar esta categoria? Esta acción no se puede deshacer.",
            )
        )
            return;
        setDeleting(true);
        try {
            await fetch(`/api/admin/category/${category._id}`, {
                method: "DELETE",
            });
            router.push("/admin/category");
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

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
                                Nombre de la categoria
                            </label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Slug (URL)</label>
                            <input
                                name="slug"
                                value={form.slug}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </section>
            </div>
            {/* Columna lateral */}
            <div className="flex flex-col gap-4">
                {/* Acciones */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Publicación
                    </h2>
                    <div className="flex flex-col gap-4">
                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                        {success && (
                            <p className="text-sm text-green-400">{success}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                        >
                            {loading
                                ? "Guardando..."
                                : mode === "edit"
                                  ? "Guardar cambios"
                                  : "Crear producto"}
                        </button>

                        {mode === "edit" && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="w-full py-2.5 rounded-xl text-red-400 text-sm font-medium border border-red-400/20 hover:bg-red-400/10 disabled:opacity-50 transition-all"
                            >
                                {deleting
                                    ? "Eliminando..."
                                    : "Eliminar producto"}
                            </button>
                        )}

                        {mode === "edit" && (
                            <a
                                href={`/categories/${category.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 rounded-xl text-gray-400 text-sm text-center hover:text-white transition-colors"
                            >
                                Ver en tienda →
                            </a>
                        )}
                    </div>
                </section>

                {/* Categorías */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Categoría padre
                    </h2>
                    <select
                        name="parentId"
                        value={form.parentId}
                        onChange={handleChange}
                        className={inputClass}
                    >
                        {form.parentId == null ? (
                            <option selected value="">
                                Categoria padre (opcional)
                            </option>
                        ) : (
                            <option value="">
                                "Categoria padre (opcional)"
                            </option>
                        )}
                        {categories.map((cat) => {
                            if (cat.id == form.parentId)
                                return (
                                    <option value={cat.id}>{cat.name}</option>
                                );
                            return <option value={cat.id}>{cat.name}</option>;
                        })}
                    </select>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto"></div>
                </section>
            </div>
        </form>
    );
}
