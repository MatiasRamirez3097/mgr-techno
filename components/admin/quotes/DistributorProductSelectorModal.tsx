"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface DistributorProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
    link: string | null;
    originalCategory?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: {
        name: string;
        sku: string;
        distributor: string;
        distributorSku: string;
        costPrice: number;
        unitPrice: number;
        quantity: number;
        taxRate: number;
    }) => void;
}

export function DistributorProductSelectorModal({
    isOpen,
    onClose,
    onSelect,
}: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DistributorProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Configuración de item seleccionado para agregar
    const [selectedProduct, setSelectedProduct] =
        useState<DistributorProduct | null>(null);
    const [markupPercentage, setMarkupPercentage] = useState<number>(30); // 30% margen por defecto
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);
    const [taxRate, setTaxRate] = useState<number>(10.5);

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setResults([]);
            setSelectedProduct(null);
            setError("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedProduct) return;
        const baseCost = selectedProduct.price || 0;
        const calculated = Math.round(baseCost * (1 + markupPercentage / 100));
        setUnitPrice(calculated);
    }, [selectedProduct, markupPercentage]);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setError("Ingresá al menos 2 caracteres para buscar");
            return;
        }

        setLoading(true);
        setError("");
        setSelectedProduct(null);

        try {
            const res = await fetch(
                `/api/admin/distributors/search?q=${encodeURIComponent(trimmed)}`,
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al consultar distribuidores");
            }

            setResults(data.products || []);
            if (!data.products || data.products.length === 0) {
                setError("No se encontraron productos en Elit ni NewBytes con ese término");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al buscar");
        } finally {
            setLoading(false);
        }
    }

    function handleConfirmAdd() {
        if (!selectedProduct) return;
        onSelect({
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            distributor: selectedProduct.distributor.toLowerCase(),
            distributorSku: selectedProduct.sku,
            costPrice: selectedProduct.price,
            unitPrice: Number(unitPrice) || 0,
            quantity: Math.max(1, Number(quantity) || 1),
            taxRate: Number(taxRate) || 10.5,
        });
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🚚</span>
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Buscar en Distribuidores Mayoristas
                            </h2>
                            <p className="text-xs text-gray-400">
                                Consultando en vivo catálogo de <strong>Elit</strong> y <strong>NewBytes</strong> (excluye INVID)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Formulario de búsqueda */}
                <div className="p-6 border-b border-gray-800 shrink-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por nombre, modelo o código de distribuidor (ej: RTX 4060, B550, Kingston)..."
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="px-5 py-2.5 bg-brand hover:brightness-110 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 shrink-0"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin text-xs">🌀</span>
                                    <span>Consultando...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔍</span>
                                    <span>Buscar</span>
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <p className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                            {error}
                        </p>
                    )}
                </div>

                {/* Cuerpo modal: Resultados o configuración de ítem */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {selectedProduct ? (
                        <div className="bg-gray-800/60 border border-brand/50 rounded-xl p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        {selectedProduct.distributor}
                                    </span>
                                    <h3 className="text-base font-bold text-white mt-1.5">
                                        {selectedProduct.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                                        SKU Distribuidor: {selectedProduct.sku} • Stock mayorista: {selectedProduct.stock} u.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProduct(null)}
                                    className="text-xs text-gray-400 hover:text-white underline"
                                >
                                    Elegir otro
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-700/60">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">
                                        Costo Mayorista
                                    </label>
                                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono">
                                        ${selectedProduct.price.toLocaleString("es-AR")}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">
                                        Margen % Sugerido
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={markupPercentage}
                                            onChange={(e) => setMarkupPercentage(Number(e.target.value) || 0)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand"
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">
                                        Precio Presupuesto ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-brand rounded-lg px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedProduct(null)}
                                    className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition"
                                >
                                    Volver
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAdd}
                                    className="px-5 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:brightness-110 transition shadow-lg shadow-brand/20"
                                >
                                    + Agregar al Presupuesto
                                </button>
                            </div>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 mb-2">
                                Se encontraron {results.length} productos. Hacé clic en uno para asignarle margen y agregarlo:
                            </p>
                            {results.map((p) => (
                                <button
                                    key={`${p.distributor}-${p.sku}`}
                                    type="button"
                                    onClick={() => setSelectedProduct(p)}
                                    className="w-full text-left bg-gray-800/40 hover:bg-gray-800 border border-gray-700/60 hover:border-gray-600 rounded-xl p-3.5 flex items-center justify-between gap-4 transition group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center shrink-0 border border-gray-700 overflow-hidden relative">
                                            {p.image ? (
                                                <Image
                                                    src={p.image}
                                                    alt={p.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs text-gray-600">📦</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                        p.distributor.toLowerCase() === "elit"
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                    }`}
                                                >
                                                    {p.distributor}
                                                </span>
                                                <span className="text-xs font-mono text-gray-400">
                                                    SKU: {p.sku}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-semibold text-white group-hover:text-brand transition-colors truncate mt-0.5">
                                                {p.name}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-bold text-white font-mono">
                                            ${p.price.toLocaleString("es-AR")}
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            Stock: {p.stock > 0 ? `${p.stock} u.` : "Consultar"}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-500 text-sm">
                            <span className="text-3xl block mb-2">🔍</span>
                            Escribí el nombre de una placa, memoria o procesador para consultar precios mayoristas en tiempo real.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
