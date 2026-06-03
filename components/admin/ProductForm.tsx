"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProductFormSidebar } from "@/components/admin/products/ProductFormSiderbar";
import { buildProductPayload } from "@/lib/products/buildProductPayload";
import { extractProductImages } from "@/lib/products/extractProductImages";
import { CreateBrandModal } from "./CreateBrandModal";
import { slugify } from "@/lib/utils/slugify";
import { useBrands } from "./products/hooks/useBrands";
import { RichTextEditor } from "@/components/admin/editor/RichTextEditor";
import type { ProductFormState } from "@/types/admin/productForm";
import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    product?: any;
    categories: CategoryDTO[];
    mode: "create" | "edit";
}

type FieldError = {
    path: string[];
    message: string;
};

export function ProductForm({ product, categories, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | FieldError[] | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState("");

    const [showCreateBrand, setShowCreateBrand] = useState(false);
    const [image, setImage] = useState(product?.image || "");
    const [images, setImages] = useState<string[]>(
        extractProductImages(product),
    );
    const { brands, setBrands } = useBrands();

    const [form, setForm] = useState<ProductFormState>({
        brand: product?.brand || "",
        name: product?.name || "",
        sku: product?.sku || "",
        mpn: product?.mpn || "",
        gtin: product?.gtin || "",
        status: product?.status || "publish",
        description: product?.description || "",
        shortDescription: product?.shortDescription || "",
        regularPrice: product?.regularPrice || 0,
        salePrice: product?.salePrice || 0,
        hasSerialNumber: product?.hasSerialNumber || false,
        stockQuantity: product?.stockQuantity ?? "",
        manageStock: product?.manageStock ?? true,
        weight: product?.weight || 0,
        length: product?.dimensions?.length || 0,
        width: product?.dimensions?.width || 0,
        height: product?.dimensions?.height || 0,
        categories: product?.categories || [],
        taxRate: product?.taxRate || 10.5,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError([]);
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/products/${product.id}`
                    : "/api/admin/products",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        buildProductPayload({
                            form,
                            image,
                            images,
                        }),
                    ),
                    credentials: "include",
                },
            );

            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                if (Array.isArray(error)) {
                    const errors = Object.fromEntries(
                        data.error.map((e: any) => [
                            e.path.join("."),
                            e.message,
                        ]),
                    );
                    setFieldErrors(errors);
                }
                throw new Error(data);
            }

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") router.push(`/admin/products/${data._id}`);
            else router.refresh();
        } catch (e: unknown) {
            console.log(e);
            //setError(e.error || "Error al guardar");
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

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            slug: slugify(prev.name),
        }));
    }, [form.name]);
    return (
        <>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>SKU</label>
                                    <input
                                        name="sku"
                                        value={form.sku}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>MPN</label>
                                    <input
                                        name="mpn"
                                        value={form.mpn}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>GTIN</label>
                                    <input
                                        name="gtin"
                                        value={form.gtin}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Descripción corta
                                </label>
                                <RichTextEditor
                                    value={form.shortDescription}
                                    onChange={(html) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            shortDescription: html,
                                        }))
                                    }
                                />
                                {fieldErrors.shortDescription && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.shortDescription}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Descripción completa
                                </label>
                                <RichTextEditor
                                    value={form.description}
                                    onChange={(html) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            description: html,
                                        }))
                                    }
                                />
                                {fieldErrors.description && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.description}
                                    </p>
                                )}
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
                                <label className={labelClass}>
                                    Precio regular
                                </label>
                                <input
                                    name="regularPrice"
                                    value={form.regularPrice}
                                    onChange={handleChange}
                                    type="number"
                                    step="0.01"
                                    required
                                    className={inputClass}
                                />
                                {fieldErrors.regularPrice && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.regularPrice}
                                    </p>
                                )}
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
                                {fieldErrors.salePrice && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.regularPrice}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Porcentaje Impuestos
                                </label>
                                <select
                                    name="taxRate"
                                    value={form.taxRate}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="10.5">10.5%</option>
                                    <option value="21">21%</option>
                                </select>
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
                                <div className="flex flex-col gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            name="hasSerialNumber"
                                            checked={form.hasSerialNumber}
                                            onChange={handleChange}
                                            type="checkbox"
                                            className="w-4 h-4 accent-brand"
                                        />
                                        <span className="text-sm text-gray-300">
                                            Tiene Número de serie?
                                        </span>
                                        {fieldErrors.manageStock && (
                                            <p className="text-sm text-red-400">
                                                {fieldErrors.manageStock}
                                            </p>
                                        )}
                                    </label>
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
                                {fieldErrors.weight && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.weight}
                                    </p>
                                )}
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
                                {fieldErrors.length && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.length}
                                    </p>
                                )}
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
                                {fieldErrors.width && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.width}
                                    </p>
                                )}
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
                                {fieldErrors.height && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.height}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <ProductFormSidebar
                    mode={mode}
                    product={product}
                    loading={loading}
                    deleting={deleting}
                    error={error}
                    success={success}
                    fieldErrors={fieldErrors}
                    categories={categories}
                    brands={brands}
                    form={form}
                    image={image}
                    images={images}
                    onImageChange={({ image, images }) => {
                        setImage(image);
                        setImages(images);
                    }}
                    onCategoryToggle={handleCategoryToggle}
                    onChange={handleChange}
                    onDelete={handleDelete}
                    onSubmit={() => {}}
                    onOpenCreateBrand={() => setShowCreateBrand(true)}
                />
            </form>
            {showCreateBrand && (
                <CreateBrandModal
                    onClose={() => setShowCreateBrand(false)}
                    onCreated={(brand) => {
                        setBrands((prev) => [...prev, brand]);

                        setForm((prev) => ({
                            ...prev,
                            brand: brand.id,
                        }));

                        setShowCreateBrand(false);
                    }}
                />
            )}
        </>
    );
}
