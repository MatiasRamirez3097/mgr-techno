"use client";

import { useEffect, useState } from "react";

import type { BrandDTO } from "@/types/shared/brand";

export const useBrands = () => {
    const [brands, setBrands] = useState<BrandDTO[]>([]);

    const [loading, setLoading] = useState(true);

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
        } catch (error) {
            console.error(error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Error al cargar marcas",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBrands();
    }, []);

    return {
        brands,

        setBrands,

        loading,

        error,

        reload: loadBrands,
    };
};
