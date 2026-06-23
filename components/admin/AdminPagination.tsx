"use client";

// NOTA: Para que funcione en tu proyecto real de Next.js, restaura estas importaciones:
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

interface Props {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}

const LIMIT_OPTIONS = [12, 20, 32] as const;

// =========================
// HELPERS
// =========================

const buildPages = (currentPage: number, totalPages: number) => {
    const pages: (number | "...")[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
        const isEdge = i === 1 || i === totalPages;
        const isNearCurrent =
            i >= currentPage - delta && i <= currentPage + delta;

        if (isEdge || isNearCurrent) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== "...") {
            pages.push("...");
        }
    }

    return pages;
};

// =========================
// COMPONENT
// =========================

export function AdminPagination({
    currentPage,
    totalPages,
    totalItems,
    limit,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Estado manual para controlar la navegación
    const [isNavigating, setIsNavigating] = useState(false);

    // Cuando searchParams cambia (la nueva página cargó), apagamos el loading
    useEffect(() => {
        setIsNavigating(false);
    }, [searchParams]);

    // =========================
    // URL BUILDER
    // =========================

    const buildUrl = (nextPage: number, nextLimit?: number) => {
        const params = new URLSearchParams(searchParams.toString());

        params.set("page", String(nextPage));

        if (nextLimit) {
            params.set("limit", String(nextLimit));
        }

        return `${pathname}?${params.toString()}`;
    };

    // =========================
    // NAVIGATION HANDLER
    // =========================
    const handleNavigation = (
        e: React.MouseEvent<HTMLAnchorElement>,
        url: string,
    ) => {
        e.preventDefault();

        // 1. Activamos el estado de carga (muestra el spinner)
        setIsNavigating(true);

        // 2. Hacemos el scroll suave
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        // 3. Navegamos a la nueva URL
        router.push(url, { scroll: false });
    };

    const pages = buildPages(currentPage, totalPages);

    if (totalItems === 0) return null;

    return (
        <div
            className={`
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-4
            mt-4
            px-2
            transition-opacity
            duration-300
            ${isNavigating ? "opacity-60 pointer-events-none" : "opacity-100"}
        `}
        >
            {/* ========================= */}
            {/* TOTAL + LIMIT OPTIONS */}
            {/* ========================= */}

            <div
                className="
                flex
                items-center
                gap-4
                flex-wrap
            "
            >
                <div
                    className="
                    text-sm
                    text-gray-400
                    flex
                    items-center
                    gap-3
                "
                >
                    <span>
                        {totalItems} resultado{totalItems !== 1 ? "s" : ""}
                    </span>

                    {/* SPINNER DE CARGA */}
                    <div
                        className={`flex items-center gap-1.5 text-brand text-xs font-medium transition-opacity duration-300 ${isNavigating ? "opacity-100" : "opacity-0"}`}
                    >
                        <svg
                            className="animate-spin h-3.5 w-3.5"
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
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                        <span>Cargando...</span>
                    </div>
                </div>

                <div
                    className="
                    flex
                    items-center
                    gap-1
                "
                >
                    {LIMIT_OPTIONS.map((option) => {
                        const url = buildUrl(1, option);
                        return (
                            <Link
                                key={option}
                                href={url}
                                onClick={(e: any) => handleNavigation(e, url)}
                                className={`
                                        px-2.5
                                        py-1
                                        rounded-lg
                                        text-xs
                                        transition-colors
                                        ${
                                            limit === option
                                                ? "bg-brand text-white font-medium"
                                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                                        }
                                    `}
                            >
                                {option}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ========================= */}
            {/* PAGINATION CONTROLS */}
            {/* ========================= */}

            {totalPages > 1 && (
                <div
                    className="
                    flex
                    items-center
                    gap-1
                    flex-wrap
                "
                >
                    {/* PREVIOUS */}

                    {currentPage > 1 ? (
                        <Link
                            href={buildUrl(currentPage - 1)}
                            onClick={(e: any) =>
                                handleNavigation(e, buildUrl(currentPage - 1))
                            }
                            className="
                                px-3
                                py-1.5
                                rounded-lg
                                text-sm
                                text-gray-400
                                hover:text-white
                                hover:bg-gray-800
                                transition-colors
                            "
                        >
                            ←
                        </Link>
                    ) : (
                        <span
                            className="
                            px-3
                            py-1.5
                            rounded-lg
                            text-sm
                            text-gray-600
                            cursor-not-allowed
                        "
                        >
                            ←
                        </span>
                    )}

                    {/* PAGES */}

                    {pages.map((page, index) => {
                        if (page === "...") {
                            return (
                                <span
                                    key={`dots-${index}`}
                                    className="
                                            px-2
                                            text-sm
                                            text-gray-600
                                        "
                                >
                                    ...
                                </span>
                            );
                        }

                        const url = buildUrl(page as number);

                        return (
                            <Link
                                key={page}
                                href={url}
                                onClick={(e: any) => handleNavigation(e, url)}
                                className={`
                                        w-8
                                        h-8
                                        rounded-lg
                                        text-sm
                                        flex
                                        items-center
                                        justify-center
                                        transition-colors
                                        ${
                                            page === currentPage
                                                ? "bg-brand text-white font-bold"
                                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                                        }
                                    `}
                            >
                                {page}
                            </Link>
                        );
                    })}

                    {/* NEXT */}

                    {currentPage < totalPages ? (
                        <Link
                            href={buildUrl(currentPage + 1)}
                            onClick={(e: any) =>
                                handleNavigation(e, buildUrl(currentPage + 1))
                            }
                            className="
                                px-3
                                py-1.5
                                rounded-lg
                                text-sm
                                text-gray-400
                                hover:text-white
                                hover:bg-gray-800
                                transition-colors
                            "
                        >
                            →
                        </Link>
                    ) : (
                        <span
                            className="
                            px-3
                            py-1.5
                            rounded-lg
                            text-sm
                            text-gray-600
                            cursor-not-allowed
                        "
                        >
                            →
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
