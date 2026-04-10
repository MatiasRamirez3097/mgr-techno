import Link from "next/link";

interface Props {
    currentPage: number;
    totalPages: number;
    basePath: string; // ej: "/products" o "/products?category=monitores"
}

export function Pagination({ currentPage, totalPages, basePath }: Props) {
    if (totalPages <= 1) return null;

    const buildUrl = (page: number) => {
        const url = new URL(basePath, "http://x");
        url.searchParams.set("page", page.toString());
        return `${url.pathname}?${url.searchParams.toString()}`;
    };

    // Generar rango de páginas visibles
    const getPages = () => {
        const pages: (number | "...")[] = [];
        const delta = 2;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
            }
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-1 mt-10">
            {/* Anterior */}
            {currentPage > 1 ? (
                <Link
                    href={buildUrl(currentPage - 1)}
                    className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                    ← Anterior
                </Link>
            ) : (
                <span className="px-3 py-2 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                    ← Anterior
                </span>
            )}

            {/* Páginas */}
            {getPages().map((page, i) =>
                page === "..." ? (
                    <span
                        key={`dots-${i}`}
                        className="px-3 py-2 text-gray-600 text-sm"
                    >
                        ...
                    </span>
                ) : (
                    <Link
                        key={page}
                        href={buildUrl(page)}
                        className={`w-9 h-9 rounded-lg text-sm flex items-center justify-center transition-colors ${
                            page === currentPage
                                ? "bg-brand text-white font-bold"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                    >
                        {page}
                    </Link>
                ),
            )}

            {/* Siguiente */}
            {currentPage < totalPages ? (
                <Link
                    href={buildUrl(currentPage + 1)}
                    className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                    Siguiente →
                </Link>
            ) : (
                <span className="px-3 py-2 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                    Siguiente →
                </span>
            )}
        </div>
    );
}
