"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Brand {
    _id: string;
    name: string;
    slug: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    brands: Brand[];
    initialHideOutOfStock: boolean;
    initialIsOutlet?: boolean; // NUEVO
}

export function FilterDrawer({
    open,
    onClose,
    brands,
    initialHideOutOfStock,
    initialIsOutlet = false,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [hideOutOfStock, setHideOutOfStock] = useState(initialHideOutOfStock);
    const [isOutlet, setIsOutlet] = useState(initialIsOutlet); // NUEVO

    useEffect(() => {
        const brandParam = searchParams.get("brand");
        if (brandParam) {
            setSelectedBrands(brandParam.split(","));
        } else {
            setSelectedBrands([]);
        }

        setHideOutOfStock(initialHideOutOfStock);
        setIsOutlet(initialIsOutlet); // Sincronizamos estado
    }, [searchParams, initialHideOutOfStock, initialIsOutlet, open]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const handleToggleBrand = (brandSlug: string) => {
        setSelectedBrands((prev) =>
            prev.includes(brandSlug)
                ? prev.filter((slug) => slug !== brandSlug)
                : [...prev, brandSlug],
        );
    };

    const handleApply = () => {
        document.cookie = `hideOutOfStock=${hideOutOfStock}; path=/; max-age=31536000`;

        const params = new URLSearchParams(searchParams.toString());

        if (selectedBrands.length > 0) {
            params.set("brand", selectedBrands.join(","));
        } else {
            params.delete("brand");
        }

        // NUEVO: Agregamos a la URL el flag de outlet
        if (isOutlet) {
            params.set("isOutlet", "true");
        } else {
            params.delete("isOutlet");
        }

        params.delete("page");

        router.push(`${pathname}?${params.toString()}`);
        router.refresh();
        onClose();
    };

    const handleClear = () => {
        setSelectedBrands([]);
        setIsOutlet(false);

        document.cookie = `hideOutOfStock=false; path=/; max-age=31536000`;

        const params = new URLSearchParams(searchParams.toString());
        params.delete("brand");
        params.delete("isOutlet");
        params.delete("page");

        router.push(`${pathname}?${params.toString()}`);
        router.refresh();
        onClose();
    };

    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Filtros</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">
                    {/* NUEVO: Switch para Filtrar Solo Outlet */}
                    <div>
                        <h3 className="text-purple-400 font-semibold mb-4 text-sm uppercase tracking-wider">
                            Ofertas Especiales
                        </h3>
                        <label className="flex items-center justify-between cursor-pointer group bg-gray-800/30 border border-purple-500/20 p-3 rounded-xl hover:border-purple-500/50 transition-colors">
                            <span className="text-gray-300 font-medium group-hover:text-white transition-colors text-sm">
                                Ver solo Outlet
                            </span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isOutlet}
                                    onChange={() => setIsOutlet(!isOutlet)}
                                />
                                <div className="w-11 h-6 bg-gray-800 border border-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:border-purple-500"></div>
                            </div>
                        </label>
                    </div>

                    {/* Marcas */}
                    {brands && brands.length > 0 && (
                        <div className="border-t border-gray-800 pt-6">
                            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
                                Marcas
                            </h3>
                            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {brands.map((brand) => (
                                    <label
                                        key={brand.slug}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedBrands.includes(
                                                brand.slug,
                                            )}
                                            onChange={() =>
                                                handleToggleBrand(brand.slug)
                                            }
                                            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-brand focus:ring-brand focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                                        />
                                        <span className="text-gray-300 group-hover:text-white transition-colors text-sm truncate">
                                            {brand.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-800 flex flex-col gap-3 bg-gray-900">
                    <button
                        onClick={handleApply}
                        className="w-full py-3 rounded-xl text-center text-white font-medium bg-brand hover:brightness-110 transition-all shadow-lg shadow-brand/20"
                    >
                        Aplicar filtros
                    </button>
                    <button
                        onClick={handleClear}
                        className="w-full py-2 rounded-xl text-center text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        Limpiar todo
                    </button>
                </div>
            </div>
        </>
    );
}
