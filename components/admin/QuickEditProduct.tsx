"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDTO } from "@/types/shared/product";

interface Props {
    product: ProductDTO;
    onClose: () => void;
}

export function QuickEditProduct({ product, onClose }: Props) {
    const router = useRouter();
    const isBundle = product.type === "bundle";
    const [form, setForm] = useState({
        regularPrice: product.regularPrice || "",
        salePrice: product.salePrice || "",
        featured: product.featured || false,
        status: product.status,
        hasFreeShipping: product.hasFreeShipping || false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const reg = Number(form.regularPrice);
        const sale = form.salePrice !== "" && form.salePrice !== null ? Number(form.salePrice) : null;

        if (isNaN(reg) || reg <= 0) {
            setError("El precio regular debe ser mayor a 0");
            setLoading(false);
            return;
        }

        if (isBundle && (sale === null || isNaN(sale) || sale <= 0)) {
            setError("El precio de oferta es obligatorio para un combo");
            setLoading(false);
            return;
        }

        if (sale !== null && (isNaN(sale) || sale <= 0)) {
            setError("El precio de oferta debe ser mayor a 0");
            setLoading(false);
            return;
        }

        if (sale !== null && sale >= reg) {
            setError("El precio de oferta debe ser menor al precio regular");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/admin/products/${product.id}`, {
                credentials: "include",
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    regularPrice: reg,
                    salePrice: sale,
                    featured: form.featured,
                    status: form.status,
                    hasFreeShipping: form.hasFreeShipping,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al guardar");
            router.refresh();
            onClose();
        } catch {
            setError("Error al guardar los cambios");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand outline-none transition-colors";

    return (
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-4xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand uppercase tracking-wider">
                            Edición rápida
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                            — {product.name} {product.sku ? `(${product.sku})` : ""}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
                    >
                        ✕ Cerrar
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block font-medium">
                            Precio regular {isBundle ? "(suma combo)" : "*"}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={form.regularPrice}
                            readOnly={isBundle}
                            disabled={isBundle}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    regularPrice: e.target.value,
                                }))
                            }
                            className={`${inputClass} ${isBundle ? "opacity-60 cursor-not-allowed" : ""}`}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1 block font-medium">
                            Precio oferta
                            <span className="text-gray-500 font-normal ml-1">
                                {isBundle ? "(obligatorio)" : "(opcional)"}
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={form.salePrice}
                            required={isBundle}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    salePrice: e.target.value,
                                }))
                            }
                            className={inputClass}
                            placeholder={isBundle ? "Precio del combo" : "Vacío = sin oferta"}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1 block font-medium">
                            Estado
                        </label>
                        <select
                            value={form.status}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    status: e.target.value as
                                        | "private"
                                        | "publish"
                                        | "draft"
                                        | "pending_review",
                                }))
                            }
                            className={inputClass}
                        >
                            <option value="publish">Publicado</option>
                            <option value="pending_review">
                                Pendiente revisión
                            </option>
                            <option value="draft">Borrador</option>
                            <option value="private">Privado</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        featured: e.target.checked,
                                    }))
                                }
                                className="w-4 h-4 accent-brand rounded"
                            />
                            <span className="text-xs text-gray-300 font-medium">
                                Destacado en inicio
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.hasFreeShipping}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        hasFreeShipping: e.target.checked,
                                    }))
                                }
                                className="w-4 h-4 accent-brand rounded"
                            />
                            <span className="text-xs text-gray-300 font-medium">
                                Envío gratis
                            </span>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-brand hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </form>
    );
}
