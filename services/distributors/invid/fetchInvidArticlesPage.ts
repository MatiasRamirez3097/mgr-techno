import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import type { InvidRawArticle } from "@/lib/distributors/invidMapper";
import { getInvidToken, INVID_STATE_ID } from "./getInvidToken";

const ARTICLES_URL = "https://invidcomputers.com/api/v1/articulo.php";
export const INVID_PAGE_SIZE = 100;

export class InvidRateLimitError extends Error {
    constructor(public retryAfterSeconds: number | null) {
        super("Se alcanzó el límite de 50 requests por hora de Invid");
        this.name = "InvidRateLimitError";
    }
}

// Guarda el cupo restante que informa Invid en cada respuesta
async function saveRateLimit(headers: Headers) {
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");
    if (remaining === null && reset === null) return;

    const update: Record<string, unknown> = {};
    if (remaining !== null) update.rateLimitRemaining = Number(remaining);
    if (reset !== null) update.rateLimitResetAt = new Date(Number(reset) * 1000);

    await DistributorSyncStateModel.updateOne(
        { _id: INVID_STATE_ID },
        { $set: update },
        { upsert: true },
    );
}

/**
 * Descarga una página (100 artículos) del catálogo de Invid.
 * Si el token fue rechazado, lo renueva y reintenta una vez.
 */
export async function fetchInvidArticlesPage(
    offset: number,
): Promise<{ articles: InvidRawArticle[]; hasNextPage: boolean }> {
    const url = new URL(ARTICLES_URL);
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("exclude_zero_price", "1");
    url.searchParams.set("exclude_zero_stock", "1");

    let token = await getInvidToken();

    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.timeout(30000),
        });

        await saveRateLimit(response.headers);

        if (response.status === 401 && attempt === 0) {
            token = await getInvidToken(true);
            continue;
        }

        if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            throw new InvidRateLimitError(retryAfter ? Number(retryAfter) : null);
        }

        // Invid responde 400 cuando el offset queda fuera de rango
        if (response.status === 400 && offset > 0) {
            return { articles: [], hasNextPage: false };
        }

        if (!response.ok) {
            throw new Error(`Invid respondió HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.status !== 1 || !Array.isArray(json.data)) {
            throw new Error("Invid devolvió una estructura inesperada");
        }

        return {
            articles: json.data as InvidRawArticle[],
            hasNextPage: Boolean(json.next_page_url),
        };
    }

    throw new Error("Invid rechazó el token renovado");
}
