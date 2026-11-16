import { ELIT_PAGE_SIZE, type ElitRawProduct } from "@/lib/distributors/elitMapper";

/**
 * Consulta `productos` de la API de Elit. Parámetros admitidos: `nombre`, `categoria`,
 * `sub_categoria`, `id`, `limit` (máx. 100) y `offset` (empieza en 1; las páginas son
 * 1, 101, 201…). Devuelve los productos tal cual (con y sin stock) y el total del paginador.
 */
export async function requestElitProducts(
    params: Record<string, string | number>,
): Promise<{ items: ElitRawProduct[]; total: number | null }> {
    const url = new URL("https://clientes.elit.com.ar/v1/api/productos");
    for (const [key, value] of Object.entries({ limit: ELIT_PAGE_SIZE, ...params })) {
        url.searchParams.append(key, String(value));
    }

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: Number(process.env.ELIT_USER_ID),
            token: process.env.ELIT_TOKEN,
        }),
        cache: "no-store",
    });

    if (!response.ok) throw new Error(`Elit HTTP error: ${response.status}`);

    const data = await response.json();
    if (data.codigo !== 200 || !Array.isArray(data.resultado)) {
        throw new Error("Elit returned an unexpected data structure");
    }

    const total = Number(data.paginador?.total);
    return { items: data.resultado, total: Number.isFinite(total) ? total : null };
}
