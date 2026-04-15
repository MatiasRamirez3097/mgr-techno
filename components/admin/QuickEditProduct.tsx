"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    product: {
        _id: string;
        regularPrice: string;
        salePrice: string;
        featured: boolean;
    };
    onClose: () => void;
}

export function QuickEditProduct({ product, onClose }: Props) {
    const router = useRouter();
    const [form, setForm] = useState({
        regularPrice: product.regularPrice || "",
        salePrice: product.salePrice || "",
        featured: product.featured || false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/admin/products/${product._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    regularPrice: form.regularPrice,
                    salePrice: form.salePrice,
                    featured: form.featured,
                }),
            });

            if (!res.ok) throw new Error("Error al guardar");
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
            <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700 w-72">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Edición rápida
                </p>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                        Precio regular
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.regularPrice}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                regularPrice: e.target.value,
                            }))
                        }
                        className={inputClass}
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                        Precio de oferta
                        <span className="text-gray-500 ml-1">
                            (dejar vacío para quitar)
                        </span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.salePrice}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                salePrice: e.target.value,
                            }))
                        }
                        className={inputClass}
                        placeholder="Vacío = sin oferta"
                    />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                featured: e.target.checked,
                            }))
                        }
                        className="w-4 h-4 accent-brand"
                    />
                    <span className="text-sm text-gray-300">
                        Producto destacado
                    </span>
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-2 mt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                        {loading ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </form>
    );
}
