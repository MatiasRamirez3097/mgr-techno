import { WOO_HEADERS } from "./woo";

export interface Product {
    id: string;
    name: string;
    price: number;
    regularPrice: number;
    onSale: boolean;
    image: string;
    images: string[];
    stock: number;
    slug: string;
    shortDescription: string;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    parent: number;
    image?: string | null;
}

interface ProductFilters {
    category?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
}

const PAGE_SIZE = 16;

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
        weight: parseFloat(p.weight || "0"),
        dimensions: {
            length: parseFloat(p.dimensions?.length || "0"),
            width: parseFloat(p.dimensions?.width || "0"),
            height: parseFloat(p.dimensions?.height || "0"),
        },
    };
}

const getWooOrder = (orderby?: string) => {
    switch (orderby) {
        case "price":
            return { orderby: "price", order: "asc" };
        case "price-desc":
            return { orderby: "price", order: "desc" };
        case "name":
            return { orderby: "title", order: "asc" };
        case "popularity":
            return { orderby: "popularity", order: "desc" };
        default:
            return { orderby: "date", order: "desc" };
    }
};

async function getCategoryIdBySlug(slug: string): Promise<number | null> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?slug=${slug}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.length ? data[0].id : null;
}

export async function getProducts(filters: ProductFilters = {}): Promise<{
    products: Product[];
    totalPages: number;
    total: number;
}> {
    const page = filters.page || 1;
    const { orderby, order } = getWooOrder(filters.orderby);

    const buildParams = (stockStatus: string) => {
        const params = new URLSearchParams();
        params.set("per_page", "100");
        params.set("orderby", orderby);
        params.set("order", order);
        params.set("stock_status", stockStatus);
        if (filters.search) params.set("search", filters.search);
        if (filters.categoryId) params.set("category", filters.categoryId);
        return params;
    };

    let categoryId: string | null = null;
    if (filters.category) {
        const id = await getCategoryIdBySlug(filters.category);
        categoryId = id ? id.toString() : null;
    }
    if (categoryId) filters.categoryId = categoryId;

    const [resInStock, resOutOfStock] = await Promise.all([
        fetch(
            `${process.env.WOO_URL}/wp-json/wc/v3/products?${buildParams("instock")}`,
            { headers: WOO_HEADERS, cache: "no-store" },
        ),
        fetch(
            `${process.env.WOO_URL}/wp-json/wc/v3/products?${buildParams("outofstock")}`,
            { headers: WOO_HEADERS, cache: "no-store" },
        ),
    ]);

    const [inStock, outOfStock] = await Promise.all([
        resInStock.json() as Promise<any[]>,
        resOutOfStock.json() as Promise<any[]>,
    ]);

    let all = [...inStock, ...outOfStock];

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        all = all.filter((p) => p.name.toLowerCase().includes(searchLower));
    }

    const allMapped = all.map(mapProduct);
    const total = allMapped.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const paginated = allMapped.slice(start, start + PAGE_SIZE);

    return { products: paginated, totalPages, total };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?slug=${slug}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    if (!data.length) return null;
    return mapProduct(data[0]);
}

export async function getOnSaleProducts(limit = 8): Promise<Product[]> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?on_sale=true&per_page=${limit}&stock_status=instock&orderby=date&order=desc`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.map(mapProduct);
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?per_page=${limit}&stock_status=instock&orderby=date&order=desc`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const data = (await res.json()) as any[];
    return data.map(mapProduct);
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
            image: c.image?.src || null,
        }));
}

export async function getCategoriesWithImages(): Promise<Category[]> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?per_page=20&hide_empty=true&parent=0`,
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
            image: c.image?.src || null,
        }));
}
