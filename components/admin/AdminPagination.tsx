"use client";

// NOTA: Para que funcione en tu proyecto real de Next.js, restaura estas importaciones:
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface Props {
    currentPage: number;
    totalPages: number;
    totalItems: number; // Antes 'total'
    limit: number; // Antes 'perPage'
}

const LIMIT_OPTIONS = [12, 20, 32] as const; // Antes 'PER_PAGE_OPTIONS'

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
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // =========================
    // URL BUILDER
    // =========================

    const buildUrl = (nextPage: number, nextLimit?: number) => {
        const params = new URLSearchParams(searchParams.toString());

        params.set("page", String(nextPage));

        if (nextLimit) {
            // Cambiamos "per_page" a "limit" para mantener coherencia con el backend
            params.set("limit", String(nextLimit));
        }

        return `${pathname}?${params.toString()}`;
    };

    // =========================
    // SMOOTH SCROLL HANDLER
    // =========================
    const handleSmoothScroll = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const pages = buildPages(currentPage, totalPages);

    // Si no hay ítems, no mostramos la paginación
    if (totalItems === 0) return null;

    return (
        <div
            className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-4
            mt-4
            px-2
        "
        >
            {/* ========================= */}
            {/* TOTAL + LIMIT OPTIONS */}
            {/* ========================= */}

            <div
                className="
                flex
                items-center
                gap-3
                flex-wrap
            "
            >
                <p
                    className="
                    text-sm
                    text-gray-400
                "
                >
                    {totalItems} resultado{totalItems !== 1 ? "s" : ""}
                </p>

                <div
                    className="
                    flex
                    items-center
                    gap-1
                "
                >
                    {LIMIT_OPTIONS.map((option) => (
                        <Link
                            key={option}
                            href={buildUrl(1, option)} // Al cambiar el límite, volvemos a la pág 1
                            scroll={false} // Desactiva salto brusco
                            onClick={handleSmoothScroll} // Ejecuta scroll suave
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
                    ))}
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
                            scroll={false} // Desactiva salto brusco
                            onClick={handleSmoothScroll} // Ejecuta scroll suave
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

                        return (
                            <Link
                                key={page}
                                href={buildUrl(page as number)}
                                scroll={false} // Desactiva salto brusco
                                onClick={handleSmoothScroll} // Ejecuta scroll suave
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
                            scroll={false} // Desactiva salto brusco
                            onClick={handleSmoothScroll} // Ejecuta scroll suave
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
