import { parseJsonLdProduct, type ReferenceProductData } from "@/lib/priceReference/jsonLdProduct";
import { fetchReferencePage } from "./fetchReferencePage";

export type ReferencePageOutcome =
    | { url: string; status: "ok"; data: ReferenceProductData }
    | { url: string; status: "not_found" }
    | { url: string; status: "error"; message: string };

/**
 * Lee una página de producto y extrae sus datos. Lanza ReferenceBlockedError si el sitio
 * rechaza la consulta, para que quien llama corte la pasada.
 */
export async function fetchReferenceProduct(url: string): Promise<ReferencePageOutcome> {
    const page = await fetchReferencePage(url);
    if (page.status === "not_found") return { url, status: "not_found" };
    if (page.status === "error") return { url, status: "error", message: page.message };

    const data = parseJsonLdProduct(page.body);
    return data
        ? { url, status: "ok", data }
        : { url, status: "error", message: "La página no tiene datos de producto (JSON-LD)" };
}
