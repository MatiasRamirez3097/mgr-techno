import type { NewBytesRawProduct } from "@/lib/distributors/newbytesMapper";
import { getNewBytesToken } from "./getNewBytesToken";

/**
 * Consulta el listado de NewBytes (`GET /v1/`). Sin parámetros devuelve el catálogo completo,
 * con y sin stock (~3.000 productos, ~3 MB). Admite `title`, `category`, `available_stock`, `order`.
 */
export async function requestNewBytesProducts(
    params: Record<string, string> = {},
): Promise<NewBytesRawProduct[]> {
    const token = await getNewBytesToken();
    const url = new URL("https://api.nb.com.ar/v1/");
    for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`NewBytes HTTP error: ${response.status}${params.category ? ` for category ${params.category}` : ""}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error("NewBytes returned an unexpected data structure");
    }
    return data;
}
