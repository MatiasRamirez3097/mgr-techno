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

    const normalizedSearch = normalizeSearch(search);

    const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);

    const query: any = {};
    if (!options?.allStatus) query.status = "publish";

    // =========================
    // SEARCH
    // =========================

    query.searchTerms = {
        $all: searchTerms,
    };

    const products = await ProductModel.find(query)
        .select(
            `
                name
                slug
                regularPrice
                salePrice
                image
                availableStock
                sku
                `,
        )
        .sort({
            availableStock: -1,
        })
        .limit(8)
        .lean();

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
