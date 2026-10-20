"use client";

import { useEffect, useState, useCallback } from "react";
import type { BrandDTO } from "@/types/shared/brand";

function sortBrandsAlphabetically(list: BrandDTO[]): BrandDTO[] {
    return [...list].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es", {
            sensitivity: "base",
        }),
    );
}

export const useBrands = (initialBrands?: BrandDTO[]) => {
    const [brands, setBrandsState] = useState<BrandDTO[]>(() =>
        sortBrandsAlphabetically(initialBrands || []),
    );
    const [loading, setLoading] = useState(
        !initialBrands || initialBrands.length === 0,
    );
    const [error, setError] = useState<string | null>(null);

    const setBrands = useCallback(
        (updater: BrandDTO[] | ((prev: BrandDTO[]) => BrandDTO[])) => {
            setBrandsState((prev) => {
                const next =
                    typeof updater === "function" ? updater(prev) : updater;
                return sortBrandsAlphabetically(next);
            });
        },
        [],
    );

    const loadBrands = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch("/api/admin/brands");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al cargar marcas");
            }

            setBrandsState(sortBrandsAlphabetically(data.brands || []));
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al cargar marcas",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialBrands || initialBrands.length === 0) {
            loadBrands();
        } else {
            setBrandsState(sortBrandsAlphabetically(initialBrands));
        }
    }, [initialBrands]);

    return {
        brands,
        setBrands,
        loading,
        error,
        reload: loadBrands,
    };
};
