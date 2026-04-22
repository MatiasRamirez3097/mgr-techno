"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    product?: any;
    categories: CategoryDTO[];
    mode: "create" | "edit";
}

function ImageUploader({
    images,
    onChange,
}: {
    images: string[];
    onChange: (images: string[]) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (data.url) uploaded.push(data.url);
            }
            onChange([...images, ...uploaded]);
        } catch (e) {
            console.log(">>> upload error:", e);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
    };

    const handleSetMain = (index: number) => {
        if (index === 0) return;
        const newImages = [...images];
        const [main] = newImages.splice(index, 1);
        newImages.unshift(main);
        onChange(newImages);
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Imagen principal */}
            {images.length > 0 && (
                <div>
                    <p className="text-xs text-gray-400 mb-2">
                        Imagen principal
                    </p>
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 w-full">
                        <Image
                            src={images[0]}
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
            )}

            {/* Galería */}
            {images.length > 1 && (
                <div>
                    <p className="text-xs text-gray-400 mb-2">Galería</p>
                    <div className="grid grid-cols-3 gap-2">
                        {images.slice(1).map((img, i) => (
                            <div
                                key={i}
                                className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group"
                            >
                                <Image
                                    src={img}
                                    alt={`Imagen ${i + 2}`}
                                    fill
                                    sizes="100px"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSetMain(i + 1)}
                                        className="w-7 h-7 rounded-full bg-brand text-white text-xs flex items-center justify-center hover:brightness-110"
                                        title="Establecer como principal"
                                    >
                                        ★
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(i + 1)}
                                        className="w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                                        title="Eliminar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Botón subida */}
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-brand text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-all"
            >
                {uploading
                    ? "Subiendo..."
                    : images.length === 0
                      ? "Subir imágenes"
                      : "+ Agregar más imágenes"}
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
            />
            {images.length > 1 && (
                <p className="text-xs text-gray-500">
                    Hover en una imagen de la galería para establecerla como
                    principal o eliminarla.
                </p>
            )}
        </div>
    );
}

export function ProductForm({ product, categories, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Extraer imágenes del producto — soporta tanto strings como objetos {src}
    const extractImages = (product?: any): string[] => {
        if (!product?.images) return [];
        return product.images
            .map((img: any) => (typeof img === "string" ? img : img.src || ""))
            .filter(Boolean);
    };

    const [images, setImages] = useState<string[]>(extractImages(product));
    const [form, setForm] = useState({
        name: product?.name || "",
        slug: product?.slug || "",
        status: product?.status || "publish",
        description: product?.description || "",
        shortDescription: product?.shortDescription || "",
        regularPrice: product?.regularPrice || "",
        salePrice: product?.salePrice || "",
        stockQuantity: product?.stockQuantity ?? "",
        manageStock: product?.manageStock ?? true,
        weight: product?.weight || 0,
        length: product?.dimensions?.length || 0,
        width: product?.dimensions?.width || 0,
        height: product?.dimensions?.height || 0,
        categories: product?.categories || [],
    });

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        console.log(name);
        console.log(value);
        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const handleCategoryToggle = (id: string) => {
        setForm((prev) => ({
            ...prev,
            categories: prev.categories.includes(id)
                ? prev.categories.filter((c: string) => c !== id)
                : [...prev.categories, id],
        }));
    };

    const buildPayload = () => ({
        name: form.name,
        slug: form.slug,
        status: form.status,
        description: form.description,
        shortDescription: form.shortDescription,
        regularPrice: form.regularPrice,
        salePrice: form.salePrice,
        manageStock: form.manageStock,
        stockQuantity: form.manageStock
            ? parseInt(form.stockQuantity) || 0
            : null,
        weight: form.weight,
        dimensions: {
            length: form.length,
            width: form.width,
            height: form.height,
        },
        categories: form.categories,
        images: images.map((url) => ({ src: url })),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/products/${product.id}`
                    : "/api/admin/products",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                    credentials: "include",
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") router.push(`/admin/products/${data._id}`);
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
                "¿Estás seguro que querés eliminar este producto? Esta acción no se puede deshacer.",
            )
        )
            return;
        setDeleting(true);
        try {
            await fetch(`/api/admin/products/${product._id}`, {
                method: "DELETE",
            });
            router.push("/admin/products");
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";
    const rootCategories = categories.filter((c) => c.parentId === null);
    const childCategories = (parentId: string) =>
        categories.filter((c) => c.parentId === parentId);

    function renderCategoryTree(
        parentId: string | null,
        level = 0,
    ): React.ReactNode {
        return categories
            .filter((c) =>
                parentId === null ? !c.parentId : c.parentId === parentId,
            )
            .map((cat) => (
                <div key={cat.id}>
                    <label
                        className="flex items-center gap-2.5 py-1 cursor-pointer"
                        style={{ paddingLeft: level * 16 }}
                    >
                        <input
                            type="checkbox"
                            checked={
                                form.categories.includes(cat.id) ? true : false
                            }
                            onChange={() => handleCategoryToggle(cat.id)}
                            className="w-4 h-4 accent-brand"
                        />

                        <span
                            className={
                                level === 0
                                    ? "text-sm text-white font-medium"
                                    : "text-sm text-gray-300"
                            }
                        >
                            {cat.name}
                        </span>
                    </label>

                    {/* 🔁 hijos recursivos */}
                    {renderCategoryTree(cat.id, level + 1)}
                </div>
            ));
    }

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
                                Nombre del producto
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
                        <div>
                            <label className={labelClass}>
                                Descripción corta
                            </label>
                            <textarea
                                name="short_description"
                                value={form.shortDescription}
                                onChange={handleChange}
                                rows={3}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Descripción completa
                            </label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={6}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </div>
                </section>

                {/* Precios */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Precios
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Precio regular</label>
                            <input
                                name="regularPrice"
                                value={form.regularPrice}
                                onChange={handleChange}
                                type="number"
                                step="0.01"
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Precio de oferta
                            </label>
                            <input
                                name="salePrice"
                                value={form.salePrice}
                                onChange={handleChange}
                                type="number"
                                step="0.01"
                                className={inputClass}
                                placeholder="Dejar vacío si no aplica"
                            />
                        </div>
                    </div>
                </section>

                {/* Stock */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Stock
                    </h2>
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="manageStock"
                                checked={form.manageStock}
                                onChange={handleChange}
                                className="w-4 h-4 accent-brand"
                            />
                            <span className="text-sm text-gray-300">
                                Gestionar stock
                            </span>
                        </label>
                        {form.manageStock && (
                            <div>
                                <label className={labelClass}>
                                    Cantidad en stock
                                </label>
                                <input
                                    name="stockQuantity"
                                    value={form.stockQuantity}
                                    onChange={handleChange}
                                    type="number"
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Envío */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Envío
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClass}>Peso (kg)</label>
                            <input
                                name="weight"
                                value={form.weight}
                                onChange={handleChange}
                                type="number"
                                step="0.01"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Largo (cm)</label>
                            <input
                                name="length"
                                value={form.length}
                                onChange={handleChange}
                                type="number"
                                step="0.1"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Ancho (cm)</label>
                            <input
                                name="width"
                                value={form.width}
                                onChange={handleChange}
                                type="number"
                                step="0.1"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Alto (cm)</label>
                            <input
                                name="height"
                                value={form.height}
                                onChange={handleChange}
                                type="number"
                                step="0.1"
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
                        <div>
                            <label className={labelClass}>Estado</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="publish">Publicado</option>
                                <option value="draft">Borrador</option>
                                <option value="private">Privado</option>
                            </select>
                        </div>

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
                                href={`/products/${product.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 rounded-xl text-gray-400 text-sm text-center hover:text-white transition-colors"
                            >
                                Ver en tienda →
                            </a>
                        )}
                    </div>
                </section>

                {/* Imágenes */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Imágenes
                    </h2>
                    <ImageUploader images={images} onChange={setImages} />
                </section>

                {/* Categorías */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Categorías
                    </h2>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {renderCategoryTree(null)}
                    </div>
                </section>
            </div>
        </form>
    );
}
