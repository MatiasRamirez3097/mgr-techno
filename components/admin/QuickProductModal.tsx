"use client";

import { useState, useEffect } from "react";

interface Props {
    isOpen: boolean;
    initialName?: string;
    onClose: () => void;
    onSuccess: (product: any, costPrice: number) => void;
}

export function QuickProductModal({
    isOpen,
    initialName = "",
    onClose,
    onSuccess,
}: Props) {
    const [name, setName] = useState(initialName);
    const [sku, setSku] = useState("");
    const [brand, setBrand] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [costPrice, setCostPrice] = useState<number | "">("");
    const [regularPrice, setRegularPrice] = useState<number | "">("");
    const [taxRate, setTaxRate] = useState<number>(10.5);
    const [hasSerialNumber, setHasSerialNumber] = useState(false);

    const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setError("");
        }
    }, [isOpen, initialName]);

    useEffect(() => {
        if (!isOpen) return;

        // Cargar marcas para selector
        fetch("/api/admin/brands")
            .then((res) => res.json())
            .then((data) => {
                const rawBrands = data.brands || data.data || [];
                const sorted = rawBrands.sort((a: any, b: any) =>
                    (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }),
                );
                setBrands(sorted);
            })
            .catch(() => {});

        // Cargar categorías para selector
        fetch("/api/admin/categories")
            .then((res) => res.json())
            .then((data) => {
                const rawCats = data.categories || data.data || [];
                const sorted = rawCats.sort((a: any, b: any) =>
                    (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }),
                );
                setCategories(sorted);
            })
            .catch(() => {});
    }, [isOpen]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("El nombre del producto es obligatorio");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                name: name.trim(),
                sku: sku.trim() || undefined,
                brand: brand || undefined,
                categoryId: categoryId || undefined,
                costPrice: Number(costPrice) || 0,
                regularPrice: regularPrice !== "" ? Number(regularPrice) : undefined,
                taxRate: Number(taxRate) || 10.5,
                hasSerialNumber: Boolean(hasSerialNumber),
            };

            const res = await fetch("/api/admin/products/quick", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al crear el producto rápido");
            }

            const createdProduct = data.product || data.data;
            onSuccess(createdProduct, Number(costPrice) || 0);
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-xl px-3.5 py-2.5 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-xs font-medium text-gray-300 mb-1 block";

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Carga rápida de producto
                            </h2>
                            <p className="text-xs text-gray-400">
                                Permite incorporar el producto a la compra inmediatamente.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Banner explicativo del estado */}
                <div className="mb-4 rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-3 text-xs text-yellow-200/90 leading-relaxed flex items-start gap-2.5">
                    <span className="text-yellow-400 text-sm shrink-0 mt-0.5">⚠️</span>
                    <div>
                        El producto se guardará con estado{" "}
                        <strong className="text-yellow-300 uppercase">Pendiente de revisión</strong>.
                        No será visible en la tienda pública hasta que completes sus imágenes y descripción desde la sección de Productos.
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Nombre del producto */}
                    <div>
                        <label className={labelClass}>
                            Nombre del producto <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Motherboard ASUS Prime B650M-A WiFi II"
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* SKU */}
                        <div>
                            <label className={labelClass}>SKU / Código distribuidor</label>
                            <input
                                type="text"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="Ej: PRIME-B650M-A"
                                className={inputClass}
                            />
                        </div>

                        {/* Marca */}
                        <div>
                            <label className={labelClass}>Marca</label>
                            <select
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Sin marca específica</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Categoría */}
                        <div>
                            <label className={labelClass}>Categoría principal</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Sin categoría asignada</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Alícuota IVA */}
                        <div>
                            <label className={labelClass}>Alícuota IVA</label>
                            <select
                                value={taxRate}
                                onChange={(e) => setTaxRate(Number(e.target.value))}
                                className={inputClass}
                            >
                                <option value={10.5}>10.5% (Hardware / Componentes)</option>
                                <option value={21}>21% (General / Periféricos)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Costo de compra unitario */}
                        <div>
                            <label className={labelClass}>Costo de compra unitario ($ / USD)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costPrice}
                                onChange={(e) =>
                                    setCostPrice(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                placeholder="Costo en la compra"
                                className={inputClass}
                            />
                        </div>

                        {/* Precio de venta sugerido */}
                        <div>
                            <label className={labelClass}>
                                Precio de venta sugerido ($)
                                <span className="text-[11px] text-gray-400 font-normal ml-1">
                                    (opcional)
                                </span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={regularPrice}
                                onChange={(e) =>
                                    setRegularPrice(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                placeholder="Precio al público"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Serial toggle */}
                    <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasSerialNumber}
                                onChange={(e) => setHasSerialNumber(e.target.checked)}
                                className="rounded border-gray-700 bg-gray-900 text-brand focus:ring-brand w-4 h-4 mt-0.5 cursor-pointer"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-white">
                                    ¿Lleva número de serie individual (S/N)?
                                </span>
                                <span className="text-[11px] text-gray-400 mt-0.5">
                                    Marcá esta opción si cada unidad física trae su propio número de serie (ej: motherboards, GPUs, CPUs, discos). Al recepcionar la compra se te solicitará escanearlos.
                                </span>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-xs hover:border-gray-500 hover:text-white transition-all"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            <span>⚡</span>
                            <span>{loading ? "Creando..." : "Crear y agregar a la compra"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
