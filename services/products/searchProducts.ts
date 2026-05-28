import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models/Product";

import { normalizeSearch } from "@/lib/search/normalize";

export async function searchProducts(search: string) {
    await connectDB();

    if (!search?.trim()) {
        return [];
    }

    const normalizedSearch = normalizeSearch(search);

    const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);

    const query: any = {
        status: "publish",
    };

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
                price
                salePrice
                images
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

        price: product.salePrice || product.price,

        image: product.images?.[0] || null,

        inStock: product.availableStock > 0,
    }));
}
