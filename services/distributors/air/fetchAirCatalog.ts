import {
    decodeAirText,
    parseAirCsv,
    parseAirRubros,
    type AirRawRow,
    type AirRubrosData,
} from "@/lib/distributors/airMapper";

export const AIR_STATE_ID = "air";

const AIR_BASE_URL = "https://air-intra.com.ar/2025";
const USER_AGENT = "Mozilla/5.0 (compatible; MGRTechno/1.0)";
const TIMEOUT_MS = 60000;

// Mismo filtro que arma la intranet cuando no hay nada seleccionado (filter_to_dw en index_nav.js)
const DEFAULT_FILTER = {
    grupo: 0,
    rubro: "",
    estado: "D",
    texto: "",
    orden: "",
    stock: "D",
    codiart: "",
    canasto: 0,
    favoritos: "0",
    limit: 0,
};

export interface AirCatalogDownload {
    rows: AirRawRow[];
    skipped: number;
    names: AirRubrosData;
}

// "fetch failed" no dice nada: el motivo real (DNS, conexión rechazada, timeout, TLS) está en `cause`
function describeFetchError(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    if (error.name === "TimeoutError") return `sin respuesta en ${TIMEOUT_MS / 1000} s`;
    const cause = error.cause as { code?: string; message?: string } | undefined;
    const detail = [cause?.code, cause?.message].filter(Boolean).join(": ");
    return detail ? `${error.message} (${detail})` : error.message;
}

// fetch que, si falla la conexión, informa en qué paso y por qué
async function airFetch(step: string, url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            ...init,
            headers: { "User-Agent": USER_AGENT, ...init.headers },
        });
    } catch (error) {
        throw new Error(`No se pudo conectar con AIR (${step}): ${describeFetchError(error)}`);
    }
}

// Cookies "nombre=valor" de una respuesta, para reenviarlas en los requests siguientes
function readCookies(res: Response): string[] {
    return res.headers.getSetCookie().map((c) => c.split(";")[0]);
}

/**
 * Inicia sesión en la intranet de AIR con AIR_USER / AIR_PASSWORD y devuelve las cookies de sesión.
 */
async function loginToAir(): Promise<string> {
    const user = process.env.AIR_USER;
    const password = process.env.AIR_PASSWORD;
    if (!user || !password) {
        throw new Error("Faltan las variables de entorno AIR_USER y AIR_PASSWORD");
    }

    const loginPage = await airFetch("página de login", `${AIR_BASE_URL}/ar/`, {});
    let cookies = readCookies(loginPage);

    const login = await airFetch("login", `${AIR_BASE_URL}/ar/`, {
        method: "POST",
        redirect: "manual",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookies.join("; "),
            Referer: `${AIR_BASE_URL}/ar/`,
        },
        body: new URLSearchParams({ p: "", urbid: user, urbpass: password, from: "", submit: "" }),
    });
    const newCookies = readCookies(login);
    if (newCookies.length > 0) cookies = newCookies;

    // Si las credenciales son incorrectas vuelve a mostrar el formulario de login
    const html = await login.text();
    if (html.includes('id="urbpass"') || cookies.length === 0) {
        throw new Error("No se pudo iniciar sesión en AIR: revisá AIR_USER y AIR_PASSWORD");
    }

    return cookies.join("; ");
}

async function fetchWithSession(step: string, path: string, cookie: string): Promise<Response> {
    return airFetch(step, `${AIR_BASE_URL}${path}`, {
        headers: { Cookie: cookie, Referer: `${AIR_BASE_URL}/ar/` },
    });
}

/**
 * Descarga la lista completa (CSV) y los nombres de rubros y grupos de la intranet de AIR.
 */
export async function fetchAirCatalog(): Promise<AirCatalogDownload> {
    const cookie = await loginToAir();

    const query = encodeURIComponent(JSON.stringify(DEFAULT_FILTER));
    const csvRes = await fetchWithSession("descarga de la lista", `/consultas/descargas.php?type=csv&q=${query}`, cookie);
    if (!csvRes.ok) {
        throw new Error(`AIR respondió HTTP ${csvRes.status} al descargar la lista`);
    }
    // Sin sesión válida devuelve una página HTML en lugar del CSV
    if (!/csv/i.test(csvRes.headers.get("content-type") || "")) {
        throw new Error("AIR no devolvió la lista CSV (¿cambió el login o la descarga?)");
    }
    const { rows, skipped } = parseAirCsv(decodeAirText(await csvRes.arrayBuffer()));
    if (rows.length === 0) {
        throw new Error("La lista de AIR llegó vacía o con un formato desconocido");
    }

    // Los nombres son opcionales: sin ellos se muestran los códigos de rubro
    let names: AirRubrosData = { rubros: new Map(), grupos: new Map() };
    try {
        const rubrosRes = await fetchWithSession("rubros", "/cache/rubros.txt", cookie);
        if (rubrosRes.ok) {
            names = parseAirRubros(decodeAirText(await rubrosRes.arrayBuffer()));
        }
    } catch (error) {
        console.error("AIR: no se pudieron obtener los nombres de rubros:", error);
    }

    return { rows, skipped, names };
}
