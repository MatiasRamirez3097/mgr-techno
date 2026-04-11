// lib/products.ts
import { Product } from "@/types/product";
import { WOO_HEADERS } from "./woo";
const PAGE_SIZE = 16;

interface ProductFilters {
    category?: string;
    search?: string;
    page?: number;
}

function mapProduct(p: any): Product {
    return {
        id: p.id.toString(),
        name: p.name,
        price: parseFloat(p.price || "0"),
        regularPrice: parseFloat(p.regular_price || "0"),
        onSale: p.on_sale,
        image: p.images?.[0]?.src || "",
        images: p.images?.map((img: any) => img.src) || [],
        stock: p.stock_quantity,
        slug: p.slug,
        shortDescription: p.short_description || "",
    };
}

async function getCategoryIdBySlug(slug: string): Promise<number | null> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?slug=${slug}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.length ? data[0].id : null;
}

// lib/products.ts
export async function getProducts(filters: ProductFilters = {}): Promise<{
    products: Product[];
    totalPages: number;
    total: number;
}> {
    const page = filters.page || 1;

    const buildParams = (extraParams: Record<string, string>) => {
        const params = new URLSearchParams();
        params.set("per_page", "100"); // traemos todos para ordenar
        params.set("orderby", "date");
        params.set("order", "desc");
        if (filters.search) params.set("search", filters.search);
        Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
        return params;
    };

    // Resolver categoría si hace falta
    let categoryId: string | null = null;
    if (filters.category) {
        const id = await getCategoryIdBySlug(filters.category);
        categoryId = id ? id.toString() : null;
    }

    const extraParams: Record<string, string> = {};
    if (categoryId) extraParams["category"] = categoryId;

    // Dos requests en paralelo: con stock y sin stock
    const [resInStock, resOutOfStock] = await Promise.all([
        fetch(
            `${process.env.WOO_URL}/wp-json/wc/v3/products?${buildParams({ ...extraParams, stock_status: "instock" })}`,
            { headers: WOO_HEADERS, cache: "no-store" },
        ),
        fetch(
            `${process.env.WOO_URL}/wp-json/wc/v3/products?${buildParams({ ...extraParams, stock_status: "outofstock" })}`,
            { headers: WOO_HEADERS, cache: "no-store" },
        ),
    ]);

    const [inStock, outOfStock] = await Promise.all([
        resInStock.json() as Promise<any[]>,
        resOutOfStock.json() as Promise<any[]>,
    ]);

    // Concatenamos: con stock primero, sin stock al final
    const all = [...inStock, ...outOfStock];
    const total = all.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Paginación manual
    const start = (page - 1) * PAGE_SIZE;
    const paginated = all.slice(start, start + PAGE_SIZE);

    return {
        products: paginated.map(mapProduct),
        totalPages,
        total,
    };
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
