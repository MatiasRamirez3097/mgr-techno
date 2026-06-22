"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Brand {
    _id: string;
    name: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    brands: Brand[];
}

export function FilterDrawer({ open, onClose, brands }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Estado local para los checkboxes marcados
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

    // Sincronizar el estado con la URL cuando se abre o cambia la URL
    useEffect(() => {
        const brandParam = searchParams.get("brand");
        if (brandParam) {
            setSelectedBrands(brandParam.split(","));
        } else {
            setSelectedBrands([]);
        }
    }, [searchParams]);

    // Bloquear scroll cuando está abierto
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const handleToggleBrand = (brandId: string) => {
        setSelectedBrands((prev) =>
            prev.includes(brandId)
                ? prev.filter((id) => id !== brandId)
                : [...prev, brandId],
        );
    };

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString());

        if (selectedBrands.length > 0) {
            params.set("brand", selectedBrands.join(","));
        } else {
            params.delete("brand");
        }

        params.delete("page"); // Resetear a la página 1 al filtrar

        router.push(`${pathname}?${params.toString()}`);
        onClose();
    };

    const handleClear = () => {
        setSelectedBrands([]);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("brand");
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
        onClose();
    };

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Filtros</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
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

                {/* Contenido (Lista de Filtros) */}
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
                            Marcas
                        </h3>
                        <div className="flex flex-col gap-3">
                            {brands.map((brand) => (
                                <label
                                    key={brand._id}
                                    className="flex items-center gap-3 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedBrands.includes(
                                            brand._id,
                                        )}
                                        onChange={() =>
                                            handleToggleBrand(brand._id)
                                        }
                                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-brand focus:ring-brand focus:ring-offset-gray-900 cursor-pointer"
                                    />
                                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm">
                                        {brand.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer (Botones) */}
                <div className="px-6 py-4 border-t border-gray-700 flex flex-col gap-3">
                    <button
                        onClick={handleApply}
                        className="w-full py-3 rounded-xl text-center text-white font-medium bg-brand hover:brightness-110 transition-all"
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
