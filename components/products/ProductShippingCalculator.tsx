"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
    productId: string;
    hasFreeShipping?: boolean;
}

const LOCAL_SHIPPING_COST = 5000;
const STORAGE_KEY = "mgr_shipping_postcode";

interface QuoteResult {
    andreani?: number | null;
    viacargo?: number | null;
    andreaniError?: string;
    viacargoError?: string;
}

export function ProductShippingCalculator({
    productId,
    hasFreeShipping = false,
}: Props) {
    const [postcode, setPostcode] = useState("");
    const [quotedPostcode, setQuotedPostcode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [quotes, setQuotes] = useState<QuoteResult | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);

    const calculateShipping = useCallback(
        async (cpToQuote: string) => {
            const cleanCp = cpToQuote.replace(/\D/g, "").slice(0, 4);
            if (cleanCp.length !== 4) {
                setInputError("Ingresá un código postal válido de 4 dígitos.");
                return;
            }

            setInputError(null);
            setLoading(true);
            setQuotedPostcode(cleanCp);

            try {
                localStorage.setItem(STORAGE_KEY, cleanCp);
            } catch {
                // Ignorar errores de localStorage
            }

            if (hasFreeShipping) {
                setQuotes({
                    andreani: 0,
                    viacargo: 0,
                });
                setLoading(false);
                return;
            }

            const result: QuoteResult = {};

            await Promise.all(
                (["andreani", "viacargo"] as const).map(async (method) => {
                    try {
                        const res = await fetch("/api/shipping", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                postcode: cleanCp,
                                shippingMethod: method,
                                items: [{ id: productId, quantity: 1 }],
                            }),
                        });

                        const data = await res.json();
                        if (
                            !res.ok ||
                            data === "error" ||
                            typeof data?.total !== "number"
                        ) {
                            throw new Error(
                                data?.error ||
                                    "No disponible para este código postal",
                            );
                        }

                        result[method] = data.total;
                    } catch (err: any) {
                        result[method] = null;
                        if (method === "andreani") {
                            result.andreaniError =
                                err?.message || "No disponible";
                        } else {
                            result.viacargoError =
                                err?.message || "No disponible";
                        }
                    }
                }),
            );

            setQuotes(result);
            setLoading(false);
        },
        [productId, hasFreeShipping],
    );

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && /^\d{4}$/.test(saved)) {
                setPostcode(saved);
            }
        } catch {
            // Ignorar errores de acceso a storage
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        calculateShipping(postcode);
    };

    const isRosarioPostcode = quotedPostcode?.startsWith("20") ?? false;

    return (
        <div className="mt-5 rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            {/* Bloque fijo: Retiro en local gratis */}
            <div className="p-4 flex items-center justify-between gap-3 border-b border-gray-800/80 bg-gray-900/80">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 mt-0.5">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">
                            Retiro en nuestro local
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Caaguazú 3971, Rosario · Sin costo adicional
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
                    Gratis
                </span>
            </div>

            {/* Calculadora de envío por Código Postal */}
            <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="w-4 h-4 text-brand"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                            />
                        </svg>
                        <span>Calcular costo de envío</span>
                    </div>
                    <a
                        href="https://www.correoargentino.com.ar/formularios/cpa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand hover:underline"
                    >
                        No sé mi CP
                    </a>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={postcode}
                        onChange={(e) => {
                            const val = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4);
                            setPostcode(val);
                            if (inputError) setInputError(null);
                        }}
                        placeholder="Tu código postal (ej: 2000)"
                        className="flex-1 bg-gray-800/90 text-white text-sm rounded-xl px-3.5 py-2.5 border border-gray-700 focus:border-brand outline-none transition-colors placeholder:text-gray-500"
                    />
                    <button
                        type="submit"
                        disabled={loading || postcode.length < 4}
                        className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>Cotizando...</span>
                            </>
                        ) : (
                            "Calcular"
                        )}
                    </button>
                </form>

                {inputError && (
                    <p className="text-xs text-red-400 mt-2">{inputError}</p>
                )}

                {/* Estado cargando */}
                {loading && (
                    <div className="mt-3.5 space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-800 animate-pulse"
                            >
                                <div className="space-y-1.5">
                                    <div className="h-3.5 w-36 bg-gray-700 rounded" />
                                    <div className="h-2.5 w-24 bg-gray-800 rounded" />
                                </div>
                                <div className="h-4 w-16 bg-gray-700 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Resultados de la cotización */}
                {!loading && quotes && quotedPostcode && (
                    <div className="mt-3.5 space-y-2">
                        <p className="text-xs text-gray-400 mb-1">
                            Opciones de envío para CP{" "}
                            <span className="text-white font-semibold">
                                {quotedPostcode}
                            </span>
                            :
                        </p>

                        {/* Andreani */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                            <div>
                                <p className="text-sm font-medium text-white">
                                    Envío por Andreani
                                </p>
                                <p className="text-xs text-gray-400">
                                    Entrega a domicilio a todo el país
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {hasFreeShipping || quotes.andreani === 0 ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                                        Gratis
                                    </span>
                                ) : typeof quotes.andreani === "number" ? (
                                    <span className="text-sm font-bold text-white">
                                        $
                                        {quotes.andreani.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-500">
                                        {quotes.andreaniError ||
                                            "No disponible"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Vía Cargo */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                            <div>
                                <p className="text-sm font-medium text-white">
                                    Vía Cargo · Retiro en sucursal
                                </p>
                                <p className="text-xs text-gray-400">
                                    Retirás en la receptoria más cercana
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {hasFreeShipping || quotes.viacargo === 0 ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                                        Gratis
                                    </span>
                                ) : typeof quotes.viacargo === "number" ? (
                                    <span className="text-sm font-bold text-white">
                                        $
                                        {quotes.viacargo.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-500">
                                        Consultar en checkout
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Cadetería Rosario */}
                        <div
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                                isRosarioPostcode
                                    ? "bg-brand/5 border-brand/30"
                                    : "bg-gray-800/40 border-gray-800"
                            }`}
                        >
                            <div>
                                <p className="text-sm font-medium text-white">
                                    Cadetería en Rosario
                                </p>
                                <p className="text-xs text-gray-400">
                                    Dentro de los límites de Circunvalación
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {hasFreeShipping ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                                        Gratis
                                    </span>
                                ) : (
                                    <span className="text-sm font-bold text-white">
                                        $
                                        {LOCAL_SHIPPING_COST.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
