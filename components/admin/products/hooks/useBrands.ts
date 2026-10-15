"use client";

import { useEffect, useState } from "react";
import type { BrandDTO } from "@/types/shared/brand";

export const useBrands = (initialBrands?: BrandDTO[]) => {
    const [brands, setBrands] = useState<BrandDTO[]>(initialBrands || []);
    const [loading, setLoading] = useState(
        !initialBrands || initialBrands.length === 0,
    );
    const [error, setError] = useState<string | null>(null);

    const loadBrands = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch("/api/admin/brands");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al cargar marcas");
            }

            setBrands(data.brands || []);
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
