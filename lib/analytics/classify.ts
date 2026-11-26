import { normalizeSearch } from "@/lib/search/normalize";

/**
 * Clasificación de visitas para la medición propia de la tienda: tipo de página, canal de
 * origen y provincia. Funciones puras, sin dependencias de servidor (las usa también el
 * navegador para decidir si una visita viene de afuera).
 */

export type PageKind =
    | "home"
    | "producto"
    | "catalogo"
    | "busqueda"
    | "categoria"
    | "ofertas"
    | "ofertas-del-dia"
    | "checkout"
    | "compra"
    | "cuenta"
    | "otra";

export const PAGE_KINDS: PageKind[] = [
    "home",
    "producto",
    "catalogo",
    "busqueda",
    "categoria",
    "ofertas",
    "ofertas-del-dia",
    "checkout",
    "compra",
    "cuenta",
    "otra",
];

export const PAGE_LABELS: Record<PageKind, string> = {
    home: "Inicio",
    producto: "Ficha de producto",
    catalogo: "Catálogo",
    busqueda: "Búsqueda",
    categoria: "Categoría",
    ofertas: "Ofertas",
    "ofertas-del-dia": "Ofertas del día",
    checkout: "Checkout",
    compra: "Compra terminada",
    cuenta: "Mi cuenta",
    otra: "Otras páginas",
};

/** Tipo de página a partir de la ruta y la query (`?search=...` = búsqueda). */
export function classifyPage(pathname: string, search = ""): PageKind {
    const path = pathname.replace(/\/+$/, "") || "/";

    if (path === "/") return "home";
    if (path === "/ofertas-del-dia") return "ofertas-del-dia";
    if (path === "/productos/ofertas") return "ofertas";
    if (path.startsWith("/productos/categoria")) return "categoria";
    if (path === "/productos") {
        const params = new URLSearchParams(search);
        return params.get("search")?.trim() ? "busqueda" : "catalogo";
    }
    if (path.startsWith("/productos/")) return "producto";
    if (path === "/checkout") return "checkout";
    if (path.startsWith("/checkout/")) return "compra";
    if (path.startsWith("/mi-cuenta")) return "cuenta";
    return "otra";
}

export type TrafficChannel =
    | "direct"
    | "organic_search"
    | "paid"
    | "social"
    | "comparator"
    | "email"
    | "referral";

export const CHANNEL_LABELS: Record<TrafficChannel, string> = {
    direct: "Directo",
    organic_search: "Buscadores",
    paid: "Publicidad paga",
    social: "Redes sociales",
    comparator: "Comparadores / Shopping",
    email: "Email",
    referral: "Otros sitios",
};

export type EntryInfo = {
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    gclid?: boolean;
    fbclid?: boolean;
};

export type TrafficSource = {
    channel: TrafficChannel;
    /** Nombre corto del origen: google, instagram, hardgamers, el dominio... ("" si es directo). */
    source: string;
    medium: string;
    campaign: string;
    referrerHost: string;
};

const SEARCH_ENGINES: [RegExp, string][] = [
    [/(^|\.)google\./, "google"],
    [/^com\.google\.android\.googlequicksearchbox$/, "google"],
    [/(^|\.)bing\.com$/, "bing"],
    [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
    [/(^|\.)search\.yahoo\.com$/, "yahoo"],
    [/(^|\.)yahoo\.com$/, "yahoo"],
    [/(^|\.)yandex\./, "yandex"],
    [/(^|\.)ecosia\.org$/, "ecosia"],
    [/(^|\.)search\.brave\.com$/, "brave"],
];

const SOCIAL_NETWORKS: [RegExp, string][] = [
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)facebook\.com$/, "facebook"],
    [/(^|\.)fb\.com$/, "facebook"],
    [/(^|\.)fb\.me$/, "facebook"],
    [/^t\.co$/, "twitter"],
    [/(^|\.)x\.com$/, "twitter"],
    [/(^|\.)twitter\.com$/, "twitter"],
    [/(^|\.)tiktok\.com$/, "tiktok"],
    [/(^|\.)youtube\.com$/, "youtube"],
    [/^youtu\.be$/, "youtube"],
    [/(^|\.)linkedin\.com$/, "linkedin"],
    [/^lnkd\.in$/, "linkedin"],
    [/(^|\.)whatsapp\.com$/, "whatsapp"],
    [/^wa\.me$/, "whatsapp"],
    [/(^|\.)reddit\.com$/, "reddit"],
    [/(^|\.)pinterest\./, "pinterest"],
    [/(^|\.)threads\.net$/, "threads"],
];

const COMPARATORS: [RegExp, string][] = [
    [/(^|\.)hardgamers\.com\.ar$/, "hardgamers"],
    [/(^|\.)buscahard\./, "buscahard"],
    [/(^|\.)bestgaming\./, "bestgaming"],
];

const EMAIL_CLIENTS: [RegExp, string][] = [
    [/(^|\.)mail\.google\.com$/, "gmail"],
    [/^com\.google\.android\.gm$/, "gmail"],
    [/(^|\.)outlook\.(live|office)\.com$/, "outlook"],
    [/(^|\.)mail\.yahoo\.com$/, "yahoo"],
];

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "paid_social", "paidsocial", "ads", "ad", "display", "cpm"]);
const COMPARATOR_MEDIUMS = new Set(["comparador", "comparator", "product_feed", "shopping"]);
const EMAIL_MEDIUMS = new Set(["email", "e-mail", "newsletter", "mail"]);

/**
 * Dominios que no cuentan como origen: la propia tienda, las vueltas desde el checkout de
 * Mercado Pago, los previews de Vercel y localhost.
 */
export function isIgnoredReferrerHost(host: string): boolean {
    const h = host.toLowerCase();
    return (
        h === "" ||
        /(^|\.)mgrtechno\.com\.ar$/.test(h) ||
        /(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(h) ||
        /\.vercel\.app$/.test(h) ||
        h === "localhost" ||
        h.startsWith("localhost:") ||
        h.startsWith("127.0.0.1")
    );
}

export function referrerHostOf(referrer: string | null | undefined): string {
    if (!referrer) return "";
    try {
        return new URL(referrer).host.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
}

function matchHost(host: string, list: [RegExp, string][]): string | null {
    for (const [pattern, name] of list) {
        if (pattern.test(host)) return name;
    }
    return null;
}

function clean(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase().slice(0, 100);
}

/** Canal y origen de una visita a partir del sitio de origen y los parámetros de campaña. */
export function classifySource(entry: EntryInfo | null | undefined): TrafficSource {
    const utmSource = clean(entry?.utmSource);
    const medium = clean(entry?.utmMedium);
    const campaign = clean(entry?.utmCampaign);
    const rawHost = referrerHostOf(entry?.referrer);
    const referrerHost = isIgnoredReferrerHost(rawHost) ? "" : rawHost;
    const result = (channel: TrafficChannel, source: string): TrafficSource => ({
        channel,
        source,
        medium,
        campaign,
        referrerHost,
    });

    if (entry?.gclid || PAID_MEDIUMS.has(medium)) {
        const fallback = entry?.gclid ? "google" : entry?.fbclid ? "meta" : referrerHost;
        return result("paid", utmSource || fallback);
    }

    if (utmSource) {
        if (COMPARATOR_MEDIUMS.has(medium) || matchHost(`${utmSource}.com.ar`, COMPARATORS)) {
            return result("comparator", utmSource);
        }
        if (EMAIL_MEDIUMS.has(medium)) return result("email", utmSource);
        const social = matchHost(`${utmSource}.com`, SOCIAL_NETWORKS);
        if (social || medium === "social") return result("social", social ?? utmSource);
        const engine = matchHost(`${utmSource}.com`, SEARCH_ENGINES);
        if (engine) return result("organic_search", engine);
        return result("referral", utmSource);
    }

    if (referrerHost) {
        // Email primero: Gmail (mail.google.com) también coincide con el patrón de Google
        const email = matchHost(referrerHost, EMAIL_CLIENTS);
        if (email) return result("email", email);
        const engine = matchHost(referrerHost, SEARCH_ENGINES);
        if (engine) return result("organic_search", engine);
        const social = matchHost(referrerHost, SOCIAL_NETWORKS);
        if (social) return result("social", social);
        const comparator = matchHost(referrerHost, COMPARATORS);
        if (comparator) return result("comparator", comparator);
    }

    // fbclid sin sitio de origen: link compartido desde la app de Facebook/Instagram
    if (entry?.fbclid) return result("social", "meta");

    if (referrerHost) return result("referral", referrerHost);
    return result("direct", "");
}

/** ¿La página se abrió desde afuera (otro sitio o un link con campaña)? Lo usa el navegador. */
export function isExternalEntry(entry: EntryInfo | null | undefined): boolean {
    if (!entry) return false;
    if (entry.utmSource || entry.utmMedium || entry.gclid || entry.fbclid) return true;
    const host = referrerHostOf(entry.referrer);
    return host !== "" && !isIgnoredReferrerHost(host);
}

/** Provincias argentinas por código ISO 3166-2 (lo que manda Vercel en x-vercel-ip-country-region). */
const AR_PROVINCES: Record<string, string> = {
    A: "Salta",
    B: "Buenos Aires",
    C: "CABA",
    D: "San Luis",
    E: "Entre Ríos",
    F: "La Rioja",
    G: "Santiago del Estero",
    H: "Chaco",
    J: "San Juan",
    K: "Catamarca",
    L: "La Pampa",
    M: "Mendoza",
    N: "Misiones",
    P: "Formosa",
    Q: "Neuquén",
    R: "Río Negro",
    S: "Santa Fe",
    T: "Tucumán",
    U: "Chubut",
    V: "Tierra del Fuego",
    W: "Corrientes",
    X: "Córdoba",
    Y: "Jujuy",
    Z: "Santa Cruz",
};

/** Nombre legible de la región: provincia si es Argentina, país si es otro. */
export function regionLabel(country: string, region: string): string {
    if (!country) return "Desconocida";
    if (country !== "AR") return `Exterior (${country})`;
    return AR_PROVINCES[region.toUpperCase()] ?? "Argentina (sin provincia)";
}

/** Término de búsqueda para agrupar: minúsculas, sin tildes ni signos, espacios simples. */
export function normalizeSearchTerm(query: string): string {
    return normalizeSearch(query).replace(/\s+/g, " ").slice(0, 80).trim();
}
