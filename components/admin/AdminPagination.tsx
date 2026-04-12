"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Props {
    currentPage: number;
    totalPages: number;
    total: number;
    perPage: number;
}

const PER_PAGE_OPTIONS = [10, 15, 20];

export function AdminPagination({
    currentPage,
    totalPages,
    total,
    perPage,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const buildUrl = (page: number, pp?: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        if (pp) params.set("per_page", pp.toString());
        return `${pathname}?${params.toString()}`;
    };

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
        <div className="flex items-center justify-between mt-4 px-2">
            {/* Total y selector por página */}
            <div className="flex items-center gap-3">
                <p className="text-sm text-gray-400">
                    {total} resultado{total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                    {PER_PAGE_OPTIONS.map((opt) => (
                        <Link
                            key={opt}
                            href={buildUrl(1, opt)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                perPage === opt
                                    ? "bg-brand text-white font-medium"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                            }`}
                        >
                            {opt}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Páginas */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {currentPage > 1 ? (
                        <Link
                            href={buildUrl(currentPage - 1)}
                            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            ←
                        </Link>
                    ) : (
                        <span className="px-3 py-1.5 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                            ←
                        </span>
                    )}

                    {getPages().map((page, i) =>
                        page === "..." ? (
                            <span
                                key={`dots-${i}`}
                                className="px-2 text-gray-600 text-sm"
                            >
                                ...
                            </span>
                        ) : (
                            <Link
                                key={page}
                                href={buildUrl(page)}
                                className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                                    page === currentPage
                                        ? "bg-brand text-white font-bold"
                                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                            >
                                {page}
                            </Link>
                        ),
                    )}

                    {currentPage < totalPages ? (
                        <Link
                            href={buildUrl(currentPage + 1)}
                            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            →
                        </Link>
                    ) : (
                        <span className="px-3 py-1.5 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                            →
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
