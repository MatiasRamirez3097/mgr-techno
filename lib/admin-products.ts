import { WOO_HEADERS, WOO_HEADERS_JSON } from "./woo";

export async function getAdminProduct(id: string) {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/${id}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    return res.json();
}

export async function getAdminCategories() {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=false`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    return res.json();
}

export async function updateProduct(id: string, data: any) {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/${id}`,
        {
            method: "PUT",
            headers: WOO_HEADERS_JSON,
            body: JSON.stringify(data),
        },
    );
    return res.json();
}

export async function createProduct(data: any) {
    const res = await fetch(`${process.env.WOO_URL}/wp-json/wc/v3/products`, {
        method: "POST",
        headers: WOO_HEADERS_JSON,
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteProduct(id: string) {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/${id}?force=true`,
        { method: "DELETE", headers: WOO_HEADERS },
    );
    return res.json();
}
