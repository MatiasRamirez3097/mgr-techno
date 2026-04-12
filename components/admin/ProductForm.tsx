"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Category {
    id: number;
    name: string;
    parent: number;
}

interface Props {
    product?: any;
    categories: Category[];
    mode: "create" | "edit";
}

export function ProductForm({ product, categories, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        name: product?.name || "",
        slug: product?.slug || "",
        status: product?.status || "publish",
        description: product?.description || "",
        short_description: product?.short_description || "",
        regular_price: product?.regular_price || "",
        sale_price: product?.sale_price || "",
        stock_quantity: product?.stock_quantity ?? "",
        manage_stock: product?.manage_stock ?? true,
        weight: product?.weight || "",
        length: product?.dimensions?.length || "",
        width: product?.dimensions?.width || "",
        height: product?.dimensions?.height || "",
        categories: product?.categories?.map((c: any) => c.id) || [],
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

    const handleCategoryToggle = (id: number) => {
        setForm((prev) => ({
            ...prev,
            categories: prev.categories.includes(id)
                ? prev.categories.filter((c: number) => c !== id)
                : [...prev.categories, id],
        }));
    };

    const buildPayload = () => ({
        name: form.name,
        slug: form.slug,
        status: form.status,
        description: form.description,
        short_description: form.short_description,
        regular_price: form.regular_price,
        sale_price: form.sale_price,
        manage_stock: form.manage_stock,
        stock_quantity: form.manage_stock
            ? parseInt(form.stock_quantity) || 0
            : null,
        weight: form.weight,
        dimensions: {
            length: form.length,
            width: form.width,
            height: form.height,
        },
        categories: form.categories.map((id: number) => ({ id })),
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
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") router.push(`/admin/products/${data.id}`);
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
            await fetch(`/api/admin/products/${product.id}`, {
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

    const rootCategories = categories.filter((c) => c.parent === 0);
    const childCategories = (parentId: number) =>
        categories.filter((c) => c.parent === parentId);

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
                                value={form.short_description}
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
                                name="regular_price"
                                value={form.regular_price}
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
                                name="sale_price"
                                value={form.sale_price}
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
                                name="manage_stock"
                                checked={form.manage_stock}
                                onChange={handleChange}
                                className="w-4 h-4 accent-brand"
                            />
                            <span className="text-sm text-gray-300">
                                Gestionar stock
                            </span>
                        </label>
                        {form.manage_stock && (
                            <div>
                                <label className={labelClass}>
                                    Cantidad en stock
                                </label>
                                <input
                                    name="stock_quantity"
                                    value={form.stock_quantity}
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

                {/* Imagen actual */}
                {mode === "edit" && product?.images?.[0]?.src && (
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Imagen principal
                        </h2>
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                            <Image
                                src={product.images[0].src}
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Para cambiar imágenes usá WordPress por ahora.
                        </p>
                    </section>
                )}

                {/* Categorías */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-base font-bold text-white mb-4">
                        Categorías
                    </h2>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {rootCategories.map((cat) => (
                            <div key={cat.id}>
                                <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.categories.includes(
                                            cat.id,
                                        )}
                                        onChange={() =>
                                            handleCategoryToggle(cat.id)
                                        }
                                        className="w-4 h-4 accent-brand"
                                    />
                                    <span className="text-sm text-white font-medium">
                                        {cat.name}
                                    </span>
                                </label>
                                {childCategories(cat.id).map((child) => (
                                    <label
                                        key={child.id}
                                        className="flex items-center gap-2.5 py-1 pl-6 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.categories.includes(
                                                child.id,
                                            )}
                                            onChange={() =>
                                                handleCategoryToggle(child.id)
                                            }
                                            className="w-4 h-4 accent-brand"
                                        />
                                        <span className="text-sm text-gray-300">
                                            {child.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </form>
    );
}
