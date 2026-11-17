const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const TIMEOUT_MS = 20_000;

/** El sitio rechazó la consulta (Cloudflare, límite de requests): hay que cortar la pasada */
export class ReferenceBlockedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReferenceBlockedError";
    }
}

export type ReferencePageResult =
    | { status: "ok"; body: string }
    | { status: "not_found" }
    | { status: "error"; message: string };

export async function fetchReferencePage(url: string): Promise<ReferencePageResult> {
    let response: Response;
    try {
        response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-AR,es;q=0.9",
            },
            redirect: "follow",
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error de red";
        return { status: "error", message };
    }

    if (response.status === 404 || response.status === 410) {
        return { status: "not_found" };
    }

    const challenged = response.headers.get("cf-mitigated") === "challenge";
    if (challenged || response.status === 403 || response.status === 429) {
        throw new ReferenceBlockedError(
            challenged
                ? "Cloudflare pidió verificación (challenge): el sitio bloquea las consultas desde este servidor"
                : `El sitio respondió ${response.status}: bloqueó las consultas o pidió bajar el ritmo`,
        );
    }

    if (!response.ok) {
        return { status: "error", message: `HTTP ${response.status}` };
    }

    return { status: "ok", body: await response.text() };
}
