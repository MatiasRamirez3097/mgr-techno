import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { normalizeSearch } from "@/lib/search/normalize";

export async function searchProducts(
    search: string,
    options?: {
        allStatus?: boolean;
    },
) {
    await connectDB();

    if (!search?.trim()) {
        return [];
    }

    // Normalizamos el string (quitar acentos, caracteres raros, etc.)
    // pero NO lo dividimos en un array, le pasamos la frase entera a Atlas.
    const normalizedSearch = normalizeSearch(search).trim();

    if (!normalizedSearch) {
        return [];
    }

    // Construimos el Pipeline de Agregación paso a paso
    const pipeline: any[] = [];

    // =========================
    // 1. ATLAS SEARCH
    // =========================
    pipeline.push({
        $search: {
            index: "search_products",
            autocomplete: {
                query: normalizedSearch,
                // ¡MAGIA ACÁ! Le pasamos todos los campos como un array
                path: ["name", "sku", "mpn", "gtin"],
                fuzzy: {
                    maxEdits: 1,
                    prefixLength: 1,
                },
            },
        },
    });

    // =========================
    // 2. FILTROS (Equivalente al query.status = "publish")
    // =========================
    if (!options?.allStatus) {
        pipeline.push({
            $match: {
                status: "publish",
            },
        });
    }

    // =========================
    // 3. ORDENAMIENTO Y LÍMITE
    // =========================
    pipeline.push({
        $sort: {
            availableStock: -1, // Mantenemos tu lógica de poner los que tienen stock arriba
        },
    });

    pipeline.push({
        $limit: 8,
    });

    // =========================
    // 4. SELECCIÓN DE CAMPOS (Equivalente al .select())
    // =========================
    pipeline.push({
        $project: {
            name: 1,
            slug: 1,
            regularPrice: 1,
            salePrice: 1,
            image: 1,
            availableStock: 1,
            sku: 1,
        },
    });

    // Ejecutamos el pipeline usando aggregate en lugar de find
    const products = await ProductModel.aggregate(pipeline);

    // Retornamos mapeando los datos tal cual los espera tu frontend
    return products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        salePrice: product.salePrice,
        regularPrice: product.regularPrice,
        image: product.image || null,
        inStock: product.availableStock > 0,
    }));
}
