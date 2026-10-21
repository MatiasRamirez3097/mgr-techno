"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductFormSidebar } from "@/components/admin/products/ProductFormSiderbar";
import { buildProductPayload } from "@/services/products/buildProductPayload";
import { extractProductImages } from "@/services/products/extractProductImages";
import { getEffectiveCategoryAttributeDefinitions } from "@/services/categories/getEffectiveCategoryAttributes";
import { CreateBrandModal } from "./CreateBrandModal";
import { ProductSelector } from "./ProductSelector";
import { useBrands } from "./products/hooks/useBrands";
import { RichTextEditor } from "@/components/admin/editor/RichTextEditor";
import type { ProductFormState } from "@/types/admin/productForm";
import type { CategoryDTO } from "@/types/shared/category";
import type {
    BundleItemDTO,
    ProductAttributeDTO,
    ProductDTO,
} from "@/types/shared/product";

import type { BrandDTO } from "@/types/shared/brand";

interface Props {
    product?: ProductDTO;
    categories: CategoryDTO[];
    brands?: BrandDTO[];
    mode: "create" | "edit";
}

type FieldError = {
    path: string[];
    message: string;
};

function computeBundleRegularSum(items: BundleItemDTO[]): number {
    return items.reduce(
        (acc, item) =>
            acc +
            (Number(item.regularPrice) || 0) *
                Math.max(1, Number(item.quantity) || 1),
        0,
    );
}

function computeBundlePossibleStock(items: BundleItemDTO[]): number {
    if (!items || items.length === 0) return 0;
    let minPossible = Infinity;
    for (const item of items) {
        const compStock = Math.max(0, Number(item.availableStock) || 0);
        const qty = Math.max(1, Number(item.quantity) || 1);
        const possible = Math.floor(compStock / qty);
        if (possible < minPossible) {
            minPossible = possible;
        }
    }
    return minPossible === Infinity ? 0 : Math.max(0, minPossible);
}

export function ProductForm({
    product,
    categories,
    brands: initialBrands,
    mode,
}: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | FieldError[] | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState("");

    const [showCreateBrand, setShowCreateBrand] = useState(false);
    const [selectedBundleCandidate, setSelectedBundleCandidate] =
        useState<any>(null);
    const [candidateQuantity, setCandidateQuantity] = useState<number>(1);
    const [customSelectMode, setCustomSelectMode] = useState<
        Record<string, boolean>
    >({});
    const [customMultiInputs, setCustomMultiInputs] = useState<
        Record<string, string>
    >({});

    const [image, setImage] = useState(
        product?.image &&
            product?.image !=
                "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780913722/noimage_gamsgz.png"
            ? product.image
            : "",
    );
    const [images, setImages] = useState<string[]>(
        extractProductImages(product),
    );
    const { brands, setBrands } = useBrands(initialBrands);

    const [form, setForm] = useState<ProductFormState>({
        type: product?.type || "simple",
        bundleItems: product?.bundleItems || [],
        attributes: product?.attributes || [],
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
        hasFreeShipping: product?.hasFreeShipping || false,
        shippingSize: product?.shippingSize || "standard",
    });

    const isBundle = form.type === "bundle";

    const effectiveAttributeDefs = useMemo(
        () =>
            getEffectiveCategoryAttributeDefinitions(
                form.categories,
                categories,
            ),
        [form.categories, categories],
    );

    const getAttributeValue = (key: string): any => {
        const found = form.attributes.find((a) => a.key === key);
        return found ? found.value : undefined;
    };

    const handleSetAttributeValue = (
        key: string,
        label: string,
        value: ProductAttributeDTO["value"] | undefined,
        unit?: string,
    ) => {
        setForm((prev) => {
            const existingIdx = prev.attributes.findIndex((a) => a.key === key);
            const isEmpty =
                value === undefined ||
                value === null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0);

            if (isEmpty) {
                if (existingIdx === -1) return prev;
                return {
                    ...prev,
                    attributes: prev.attributes.filter((a) => a.key !== key),
                };
            }

            const newAttr: ProductAttributeDTO = {
                key,
                label,
                value,
                unit: unit || "",
            };

            if (existingIdx >= 0) {
                const next = [...prev.attributes];
                next[existingIdx] = newAttr;
                return { ...prev, attributes: next };
            }

            return {
                ...prev,
                attributes: [...prev.attributes, newAttr],
            };
        });
    };

    const handleAddBundleComponent = () => {
        if (!selectedBundleCandidate) return;
        if (selectedBundleCandidate.type === "bundle") {
            setError(
                "No se puede agregar un combo dentro de otro combo. Seleccioná un producto simple.",
            );
            return;
        }
        if (product?.id && selectedBundleCandidate.id === product.id) {
            setError("No se puede agregar el mismo producto como componente.");
            return;
        }

        const qtyToAdd = Math.max(1, Math.floor(Number(candidateQuantity) || 1));

        setForm((prev) => {
            const existingIdx = prev.bundleItems.findIndex(
                (b) => b.productId === selectedBundleCandidate.id,
            );
            let nextItems: BundleItemDTO[];

            if (existingIdx >= 0) {
                nextItems = prev.bundleItems.map((b, i) =>
                    i === existingIdx
                        ? { ...b, quantity: b.quantity + qtyToAdd }
                        : b,
                );
            } else {
                nextItems = [
                    ...prev.bundleItems,
                    {
                        productId: selectedBundleCandidate.id,
                        quantity: qtyToAdd,
                        name: selectedBundleCandidate.name,
                        sku: selectedBundleCandidate.sku || "",
                        image: selectedBundleCandidate.image || "",
                        regularPrice:
                            Number(selectedBundleCandidate.regularPrice) || 0,
                        availableStock:
                            Number(selectedBundleCandidate.availableStock) || 0,
                    },
                ];
            }

            return {
                ...prev,
                bundleItems: nextItems,
                regularPrice: computeBundleRegularSum(nextItems),
            };
        });

        setSelectedBundleCandidate(null);
        setCandidateQuantity(1);
    };

    const handleUpdateComponentQty = (productId: string, newQty: number) => {
        const qty = Math.max(1, Math.floor(Number(newQty) || 1));
        setForm((prev) => {
            const nextItems = prev.bundleItems.map((b) =>
                b.productId === productId ? { ...b, quantity: qty } : b,
            );
            return {
                ...prev,
                bundleItems: nextItems,
                regularPrice: computeBundleRegularSum(nextItems),
            };
        });
    };

    const handleRemoveComponent = (productId: string) => {
        setForm((prev) => {
            const nextItems = prev.bundleItems.filter(
                (b) => b.productId !== productId,
            );
            return {
                ...prev,
                bundleItems: nextItems,
                regularPrice: computeBundleRegularSum(nextItems),
            };
        });
    };

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
                    ? `/api/admin/products/${product?.id}`
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
                if (data.error) {
                    setError(data.error);
                    if (Array.isArray(data.error)) {
                        const errors = Object.fromEntries(
                            data.error.map(
                                (e: {
                                    path: (string | number)[];
                                    message: string;
                                }) => [e.path.join("."), e.message],
                            ),
                        );
                        setFieldErrors(errors);
                    }
                }
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Error al guardar producto",
                );
            }

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") {
                const createdId =
                    data.id ||
                    data.data?.id ||
                    data.data?._id ||
                    data.product?.id ||
                    data.product?._id ||
                    (Array.isArray(data.data) &&
                        (data.data[0]?.id || data.data[0]?._id));

                if (
                    createdId &&
                    typeof createdId === "string" &&
                    createdId !== "undefined"
                ) {
                    router.push(`/admin/products/${createdId}`);
                } else {
                    router.push("/admin/products");
                }
            } else {
                router.refresh();
            }
        } catch (e: unknown) {
            console.error("Error al guardar producto:", e);
            const msg =
                e instanceof Error ? e.message : "Error al guardar el producto";
            setError((prev) => (prev ? prev : msg));
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
        setError(null);
        try {
            const targetId = product?.id;
            if (!targetId) return;
            const res = await fetch(`/api/admin/products/${targetId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al eliminar producto");
            }
            router.push("/admin/products");
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al eliminar el producto",
            );
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    const bundlePossibleStock = computeBundlePossibleStock(form.bundleItems);
    const discountPercentage =
        Number(form.regularPrice) > 0 &&
        Number(form.salePrice) > 0 &&
        Number(form.salePrice) < Number(form.regularPrice)
            ? Math.round(
                  ((Number(form.regularPrice) - Number(form.salePrice)) /
                      Number(form.regularPrice)) *
                      100,
              )
            : 0;

    return (
        <>
            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {form.status === "pending_review" && (
                    <div className="lg:col-span-3 p-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 flex items-start gap-3">
                        <span className="text-xl shrink-0">⚠️</span>
                        <div className="text-sm">
                            <strong className="font-semibold block text-yellow-300 mb-0.5">
                                Producto en estado &ldquo;Pendiente de revisión&rdquo;
                            </strong>
                            Este producto fue ingresado como una <strong>carga rápida de compras</strong> o aún no fue completado. Se encuentra oculto de la tienda pública. Antes de cambiar su estado a <strong>Publicado</strong>, asegurate de cargar sus imágenes, descripción detallada y atributos.
                        </div>
                    </div>
                )}

                {/* Columna principal */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Selector de Tipo de Producto */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-3">
                            Tipo de producto
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        type: "simple",
                                    }))
                                }
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    !isBundle
                                        ? "border-brand bg-brand/10 text-white"
                                        : "border-gray-800 bg-gray-800/40 text-gray-400 hover:border-gray-700"
                                }`}
                            >
                                <div className="font-semibold text-sm">
                                    Producto Simple
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Artículo individual con su propio stock y
                                    precio.
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        type: "bundle",
                                        hasSerialNumber: false,
                                        regularPrice: computeBundleRegularSum(
                                            prev.bundleItems,
                                        ),
                                    }))
                                }
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    isBundle
                                        ? "border-brand bg-brand/10 text-white"
                                        : "border-gray-800 bg-gray-800/40 text-gray-400 hover:border-gray-700"
                                }`}
                            >
                                <div className="font-semibold text-sm flex items-center gap-2">
                                    <span>📦 Combo / Producto Compuesto</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Compuesto por 1 o más productos. Su stock y
                                    precio regular se calculan automáticamente.
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Componentes del Combo (solo cuando type === "bundle") */}
                    {isBundle && (
                        <section className="bg-gray-900 rounded-2xl p-6 border border-blue-500/30">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        Componentes del Combo
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Agregá los productos que integran este
                                        combo y la cantidad de unidades de cada
                                        uno.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                            bundlePossibleStock > 0
                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                        }`}
                                    >
                                        Stock armable: {bundlePossibleStock} u.
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-5">
                                <div className="md:col-span-7">
                                    <label className={labelClass}>
                                        Buscar producto componente
                                    </label>
                                    <ProductSelector
                                        statusAll
                                        excludeBundles
                                        value={selectedBundleCandidate}
                                        onChange={(prod) =>
                                            setSelectedBundleCandidate(prod)
                                        }
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClass}>
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={candidateQuantity}
                                        onChange={(e) =>
                                            setCandidateQuantity(
                                                Math.max(
                                                    1,
                                                    Number(e.target.value) || 1,
                                                ),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <button
                                        type="button"
                                        onClick={handleAddBundleComponent}
                                        disabled={!selectedBundleCandidate}
                                        className="w-full py-3 px-4 rounded-lg bg-brand hover:brightness-110 disabled:opacity-40 text-white text-sm font-semibold transition-all"
                                    >
                                        + Agregar al combo
                                    </button>
                                </div>
                            </div>

                            {form.bundleItems.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
                                    Todavía no agregaste productos a este combo.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-800/60 text-xs text-gray-400 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Producto
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Stock disp.
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Precio reg. u.
                                                </th>
                                                <th className="px-4 py-3 text-center w-28">
                                                    Cant. en combo
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Subtotal reg.
                                                </th>
                                                <th className="px-4 py-3 text-right w-16" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {form.bundleItems.map((comp) => {
                                                const unitReg =
                                                    Number(comp.regularPrice) ||
                                                    0;
                                                const subReg =
                                                    unitReg * comp.quantity;
                                                const compStock =
                                                    Number(
                                                        comp.availableStock,
                                                    ) || 0;
                                                const enoughForOne =
                                                    compStock >= comp.quantity;

                                                return (
                                                    <tr
                                                        key={comp.productId}
                                                        className="bg-gray-900/40"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-white line-clamp-1">
                                                                {comp.name ||
                                                                    `ID: ${comp.productId}`}
                                                            </div>
                                                            {comp.sku && (
                                                                <div className="text-xs text-gray-500">
                                                                    SKU:{" "}
                                                                    {comp.sku}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span
                                                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                    enoughForOne
                                                                        ? "bg-green-500/10 text-green-400"
                                                                        : "bg-red-500/10 text-red-400"
                                                                }`}
                                                            >
                                                                {compStock} u.
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-300">
                                                            $
                                                            {unitReg.toLocaleString(
                                                                "es-AR",
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={
                                                                    comp.quantity
                                                                }
                                                                onChange={(e) =>
                                                                    handleUpdateComponentQty(
                                                                        comp.productId,
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                className="w-20 bg-gray-800 text-white text-sm text-center rounded-lg px-2 py-1.5 border border-gray-700 focus:border-brand outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-white">
                                                            $
                                                            {subReg.toLocaleString(
                                                                "es-AR",
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemoveComponent(
                                                                        comp.productId,
                                                                    )
                                                                }
                                                                className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1"
                                                                title="Quitar del combo"
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {fieldErrors.bundleItems && (
                                <p className="text-sm text-red-400 mt-2">
                                    {fieldErrors.bundleItems}
                                </p>
                            )}
                        </section>
                    )}

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

                    {/* Atributos / Especificaciones por Categoría */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>
                                        Atributos / Especificaciones por
                                        Categoría
                                    </span>
                                    {effectiveAttributeDefs.length > 0 && (
                                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/30">
                                            {effectiveAttributeDefs.length}{" "}
                                            disponibles
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Estos atributos dependen de las categorías
                                    asignadas al producto y se utilizan en la
                                    ficha técnica y el sistema &ldquo;Armá tu
                                    PC&rdquo;.
                                </p>
                            </div>
                        </div>

                        {form.categories.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-700 p-5 text-center text-sm text-gray-400">
                                Seleccioná al menos una categoría en el panel
                                derecho para desplegar sus atributos técnicos
                                (ej. Socket, Chipset, Slots de RAM, Watts,
                                etc.).
                            </div>
                        ) : effectiveAttributeDefs.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-700 p-5 text-center text-sm text-gray-400">
                                <p>
                                    Las categorías seleccionadas aún no tienen
                                    atributos configurados.
                                </p>
                                <Link
                                    href={`/admin/categories/${form.categories[0]}`}
                                    target="_blank"
                                    className="inline-block mt-2 text-xs font-semibold text-brand hover:underline"
                                >
                                    Configurar atributos o cargar plantilla en
                                    la categoría →
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {effectiveAttributeDefs.map((def) => {
                                    const rawVal = getAttributeValue(def.key);
                                    const isCustomSelect =
                                        Boolean(customSelectMode[def.key]) ||
                                        (def.type === "select" &&
                                            (!def.options ||
                                                def.options.length === 0));
                                    const selectOptions = Array.from(
                                        new Set([
                                            ...(def.options || []),
                                            ...(typeof rawVal === "string" &&
                                            rawVal.trim() !== ""
                                                ? [rawVal]
                                                : []),
                                        ]),
                                    );

                                    return (
                                        <div
                                            key={def.key}
                                            className={`p-3.5 rounded-xl bg-gray-800/40 border border-gray-800 ${
                                                def.type === "multiselect"
                                                    ? "md:col-span-2"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                                    <span>{def.label}</span>
                                                    {def.required && (
                                                        <span
                                                            className="text-brand text-[10px] font-bold"
                                                            title="Recomendado para compatibilidad en Armá tu PC"
                                                        >
                                                            *
                                                        </span>
                                                    )}
                                                </label>
                                                <span className="text-[10px] font-mono text-gray-500">
                                                    {def.key}
                                                </span>
                                            </div>

                                            {/* SELECT */}
                                            {def.type === "select" && (
                                                <div>
                                                    {isCustomSelect ? (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={
                                                                    typeof rawVal ===
                                                                    "string"
                                                                        ? rawVal
                                                                        : ""
                                                                }
                                                                onChange={(e) =>
                                                                    handleSetAttributeValue(
                                                                        def.key,
                                                                        def.label,
                                                                        e.target
                                                                            .value,
                                                                        def.unit,
                                                                    )
                                                                }
                                                                placeholder={`Ingresar ${def.label.toLowerCase()}...`}
                                                                className={
                                                                    inputClass
                                                                }
                                                            />
                                                            {def.options &&
                                                                def.options
                                                                    .length >
                                                                    0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setCustomSelectMode(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [def.key]: false,
                                                                                }),
                                                                            )
                                                                        }
                                                                        className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 shrink-0"
                                                                    >
                                                                        Lista
                                                                    </button>
                                                                )}
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={
                                                                typeof rawVal ===
                                                                "string"
                                                                    ? rawVal
                                                                    : ""
                                                            }
                                                            onChange={(e) => {
                                                                if (
                                                                    e.target
                                                                        .value ===
                                                                    "__custom__"
                                                                ) {
                                                                    setCustomSelectMode(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            [def.key]: true,
                                                                        }),
                                                                    );
                                                                } else {
                                                                    handleSetAttributeValue(
                                                                        def.key,
                                                                        def.label,
                                                                        e.target
                                                                            .value,
                                                                        def.unit,
                                                                    );
                                                                }
                                                            }}
                                                            className={
                                                                inputClass
                                                            }
                                                        >
                                                            <option value="">
                                                                — Sin
                                                                especificar —
                                                            </option>
                                                            {selectOptions.map(
                                                                (opt) => (
                                                                    <option
                                                                        key={
                                                                            opt
                                                                        }
                                                                        value={
                                                                            opt
                                                                        }
                                                                    >
                                                                        {opt}
                                                                    </option>
                                                                ),
                                                            )}
                                                            <option value="__custom__">
                                                                + Escribir otro
                                                                valor...
                                                            </option>
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {/* MULTISELECT */}
                                            {def.type === "multiselect" && (
                                                <div>
                                                    {(() => {
                                                        const selectedArr: string[] =
                                                            Array.isArray(
                                                                rawVal,
                                                            )
                                                                ? rawVal.map(
                                                                      String,
                                                                  )
                                                                : typeof rawVal ===
                                                                        "string" &&
                                                                    rawVal
                                                                  ? [rawVal]
                                                                  : [];
                                                        const allMultiOpts =
                                                            Array.from(
                                                                new Set([
                                                                    ...(def.options ||
                                                                        []),
                                                                    ...selectedArr,
                                                                ]),
                                                            );

                                                        const toggleOpt = (
                                                            opt: string,
                                                        ) => {
                                                            const next =
                                                                selectedArr.includes(
                                                                    opt,
                                                                )
                                                                    ? selectedArr.filter(
                                                                          (x) =>
                                                                              x !==
                                                                              opt,
                                                                      )
                                                                    : [
                                                                          ...selectedArr,
                                                                          opt,
                                                                      ];
                                                            handleSetAttributeValue(
                                                                def.key,
                                                                def.label,
                                                                next,
                                                                def.unit,
                                                            );
                                                        };

                                                        const addCustomMulti =
                                                            () => {
                                                                const custom = (
                                                                    customMultiInputs[
                                                                        def.key
                                                                    ] || ""
                                                                ).trim();
                                                                if (!custom)
                                                                    return;
                                                                if (
                                                                    !selectedArr.includes(
                                                                        custom,
                                                                    )
                                                                ) {
                                                                    handleSetAttributeValue(
                                                                        def.key,
                                                                        def.label,
                                                                        [
                                                                            ...selectedArr,
                                                                            custom,
                                                                        ],
                                                                        def.unit,
                                                                    );
                                                                }
                                                                setCustomMultiInputs(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [def.key]:
                                                                            "",
                                                                    }),
                                                                );
                                                            };

                                                        return (
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {allMultiOpts.map(
                                                                        (
                                                                            opt,
                                                                        ) => {
                                                                            const active =
                                                                                selectedArr.includes(
                                                                                    opt,
                                                                                );
                                                                            return (
                                                                                <button
                                                                                    key={
                                                                                        opt
                                                                                    }
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        toggleOpt(
                                                                                            opt,
                                                                                        )
                                                                                    }
                                                                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                                                                        active
                                                                                            ? "bg-brand/20 border-brand text-white font-medium"
                                                                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                                                                    }`}
                                                                                >
                                                                                    {active
                                                                                        ? `✓ ${opt}`
                                                                                        : opt}
                                                                                </button>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2 mt-1">
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            customMultiInputs[
                                                                                def
                                                                                    .key
                                                                            ] ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setCustomMultiInputs(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [def.key]:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                }),
                                                                            )
                                                                        }
                                                                        onKeyDown={(
                                                                            e,
                                                                        ) => {
                                                                            if (
                                                                                e.key ===
                                                                                "Enter"
                                                                            ) {
                                                                                e.preventDefault();
                                                                                addCustomMulti();
                                                                            }
                                                                        }}
                                                                        placeholder="Agregar otro valor compatible..."
                                                                        className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-brand outline-none flex-1"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            addCustomMulti
                                                                        }
                                                                        className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-white font-medium shrink-0"
                                                                    >
                                                                        +
                                                                        Agregar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* NUMBER */}
                                            {def.type === "number" && (
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={
                                                            rawVal !==
                                                                undefined &&
                                                            rawVal !== null &&
                                                            rawVal !== ""
                                                                ? String(rawVal)
                                                                : ""
                                                        }
                                                        onChange={(e) => {
                                                            const v =
                                                                e.target.value;
                                                            handleSetAttributeValue(
                                                                def.key,
                                                                def.label,
                                                                v === ""
                                                                    ? undefined
                                                                    : Number(v),
                                                                def.unit,
                                                            );
                                                        }}
                                                        placeholder="0"
                                                        className={`${inputClass} ${
                                                            def.unit
                                                                ? "pr-16"
                                                                : ""
                                                        }`}
                                                    />
                                                    {def.unit && (
                                                        <span className="absolute right-3 text-xs font-mono text-gray-400 pointer-events-none">
                                                            {def.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* BOOLEAN */}
                                            {def.type === "boolean" && (
                                                <select
                                                    value={
                                                        rawVal === true
                                                            ? "true"
                                                            : rawVal === false
                                                              ? "false"
                                                              : ""
                                                    }
                                                    onChange={(e) => {
                                                        const v =
                                                            e.target.value;
                                                        handleSetAttributeValue(
                                                            def.key,
                                                            def.label,
                                                            v === "true"
                                                                ? true
                                                                : v === "false"
                                                                  ? false
                                                                  : undefined,
                                                            def.unit,
                                                        );
                                                    }}
                                                    className={inputClass}
                                                >
                                                    <option value="">
                                                        — Sin especificar —
                                                    </option>
                                                    <option value="true">
                                                        Sí
                                                    </option>
                                                    <option value="false">
                                                        No
                                                    </option>
                                                </select>
                                            )}

                                            {/* TEXT */}
                                            {def.type === "text" && (
                                                <input
                                                    type="text"
                                                    value={
                                                        typeof rawVal ===
                                                        "string"
                                                            ? rawVal
                                                            : ""
                                                    }
                                                    onChange={(e) =>
                                                        handleSetAttributeValue(
                                                            def.key,
                                                            def.label,
                                                            e.target.value,
                                                            def.unit,
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Precios */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">
                                Precios
                            </h2>
                            {isBundle && discountPercentage > 0 && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                                    Ahorro del combo: {discountPercentage}% OFF
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {isBundle
                                        ? "Precio regular (Suma automática de componentes)"
                                        : "Precio regular"}
                                </label>
                                <input
                                    name="regularPrice"
                                    value={form.regularPrice}
                                    onChange={handleChange}
                                    type="number"
                                    step="0.01"
                                    required
                                    readOnly={isBundle}
                                    className={`${inputClass} ${isBundle ? "opacity-60 cursor-not-allowed bg-gray-900" : ""}`}
                                />
                                {fieldErrors.regularPrice && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.regularPrice}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {isBundle
                                        ? "Precio de oferta del combo (Obligatorio)"
                                        : "Precio de oferta"}
                                </label>
                                <input
                                    name="salePrice"
                                    value={form.salePrice}
                                    onChange={handleChange}
                                    type="number"
                                    step="0.01"
                                    required={isBundle}
                                    className={inputClass}
                                    placeholder={
                                        isBundle
                                            ? "Precio final de venta del combo"
                                            : "Dejar vacío si no aplica"
                                    }
                                />
                                {fieldErrors.salePrice && (
                                    <p className="text-sm text-red-400">
                                        {fieldErrors.salePrice}
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
                        {isBundle ? (
                            <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4 text-xs text-gray-300 leading-relaxed">
                                El stock de este combo es{" "}
                                <strong>virtual</strong> y se calcula
                                automáticamente según el stock disponible de los
                                productos que lo componen. Si el combo se queda
                                sin stock y luego sus componentes recuperan
                                stock, el combo pasará a{" "}
                                <strong>Pendiente de revisión</strong> para
                                verificar su precio de oferta.
                            </div>
                        ) : (
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
                        )}
                    </section>

                    {/* Envío */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Envío
                        </h2>
                        {/* Controles de Envío Gratis y Tamaño */}
                        <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-800">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="hasFreeShipping"
                                    checked={form.hasFreeShipping}
                                    onChange={handleChange}
                                    className="w-4 h-4 accent-brand"
                                />
                                <span className="text-sm text-gray-300">
                                    Habilitar envío gratis para este producto
                                </span>
                            </label>

                            <div>
                                <label className={labelClass}>
                                    Tamaño del paquete (Define reglas de costo
                                    si se mezcla con otros productos)
                                </label>
                                <select
                                    name="shippingSize"
                                    value={form.shippingSize}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="small">
                                        Pequeño (ej. RAM, Procesadores, SSD,
                                        Pendrives)
                                    </option>
                                    <option value="standard">
                                        Estándar (ej. Placas de video,
                                        Motherboards, Periféricos)
                                    </option>
                                    <option value="bulky">
                                        Voluminoso (ej. Gabinetes, Monitores,
                                        Sillas)
                                    </option>
                                </select>
                            </div>
                        </div>
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
