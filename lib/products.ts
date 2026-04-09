// lib/products.ts
import { Product } from "@/types/product";

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

export async function getProducts(): Promise<Product[]> {
    const res = await fetch(`${process.env.WOO_URL}/wp-json/wc/v3/products`, {
        headers: WOO_HEADERS,
        cache: "no-store",
    });
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
