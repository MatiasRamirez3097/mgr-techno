// lib/products.ts
import { Product } from "@/types/product";

interface ProductFilters {
    category?: string;
    search?: string;
}

function mapProduct(p: any): Product {
    return {
        id: p.id.toString(),
        name: p.name,
        price: parseFloat(p.price || "0"),
        regularPrice: parseFloat(p.regular_price || "0"),
        onSale: p.on_sale,
        image: p.images?.[0]?.src || "",
        stock: p.stock_quantity,
        slug: p.slug,
        shortDescription: p.short_description || "",
    };
}

const WOO_HEADERS = {
    Authorization:
        "Basic " +
        Buffer.from(
            `${process.env.WOO_KEY}:${process.env.WOO_SECRET}`,
        ).toString("base64"),
};

async function getCategoryIdBySlug(slug: string): Promise<number | null> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?slug=${slug}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.length ? data[0].id : null;
}

export async function getProducts(
    filters: ProductFilters = {},
): Promise<Product[]> {
    const params = new URLSearchParams();
    params.set("per_page", "50");

    if (filters.search) params.set("search", filters.search);

    if (filters.category) {
        const categoryId = await getCategoryIdBySlug(filters.category);
        if (categoryId) params.set("category", categoryId.toString());
    }

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?${params.toString()}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    console.log(slug);
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?slug=${slug}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    console.log(">>> getProductBySlug", slug, data);
    if (!data.length) return null;
    return mapProduct(data[0]);
}

//category

export interface Category {
    id: number;
    name: string;
    slug: string;
    parent: number; // 👈 0 = categoría raíz, >0 = subcategoría
}

export async function getCategories(): Promise<Category[]> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=true`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data
        .filter((c) => c.slug !== "uncategorized")
        .map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            parent: c.parent,
        }));
}
