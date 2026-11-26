/**
 * Medición propia de la tienda, lado navegador. Manda eventos a /api/track con sendBeacon
 * (no frena la página ni se pierde al navegar). Visitante y visita son ids aleatorios guardados
 * en localStorage; la visita se corta tras 30 minutos sin actividad o al volver a entrar desde
 * otro sitio o desde un link con campaña.
 */
import { isExternalEntry, type EntryInfo } from "@/lib/analytics/classify";
import type { TrackEventType } from "@/lib/validators/trackEventSchema";

const VISITOR_KEY = "mgr-vid";
const SESSION_KEY = "mgr-session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_VIEWED_PRODUCTS = 200;

type StoredSession = {
    id: string;
    lastSeen: number;
    entry: EntryInfo | null;
    viewed: string[];
};

// Respaldo si localStorage no está disponible (navegación privada en algunos navegadores)
const memory = new Map<string, string>();

function readStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return memory.get(key) ?? null;
    }
}

function writeStorage(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        memory.set(key, value);
    }
}

function randomId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Cómo se abrió esta carga de página: se lee una sola vez, en el primer evento. */
let pageLoadEntry: EntryInfo | null | undefined;
let pageLoadEntryUsed = false;

function getPageLoadEntry(): EntryInfo {
    if (pageLoadEntry === undefined) {
        const params = new URLSearchParams(window.location.search);
        const param = (key: string) => params.get(key)?.slice(0, 300) ?? null;
        pageLoadEntry = {
            referrer: document.referrer ? document.referrer.slice(0, 1000) : null,
            utmSource: param("utm_source"),
            utmMedium: param("utm_medium"),
            utmCampaign: param("utm_campaign"),
            gclid: params.has("gclid"),
            fbclid: params.has("fbclid"),
        };
    }
    return pageLoadEntry as EntryInfo;
}

function getVisitorId(): string {
    let id = readStorage(VISITOR_KEY);
    if (!id) {
        id = randomId();
        writeStorage(VISITOR_KEY, id);
    }
    return id;
}

function readSession(): StoredSession | null {
    const raw = readStorage(SESSION_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as StoredSession;
        return parsed?.id ? { ...parsed, viewed: parsed.viewed ?? [] } : null;
    } catch {
        return null;
    }
}

function getSession(now: number): StoredSession {
    const stored = readSession();
    const entry = getPageLoadEntry();
    const firstEventOfLoad = !pageLoadEntryUsed;
    pageLoadEntryUsed = true;

    const expired = !stored || now - stored.lastSeen > SESSION_TIMEOUT_MS;
    const cameFromOutside = firstEventOfLoad && isExternalEntry(entry);

    if (stored && !expired && !cameFromOutside) {
        return { ...stored, lastSeen: now };
    }

    return {
        id: randomId(),
        lastSeen: now,
        // Si la visita se cortó por inactividad sin recargar, no hay origen nuevo: directo
        entry: firstEventOfLoad ? entry : null,
        viewed: [],
    };
}

function send(payload: unknown) {
    const body = JSON.stringify(payload);
    try {
        if (navigator.sendBeacon) {
            const ok = navigator.sendBeacon(
                "/api/track",
                new Blob([body], { type: "application/json" }),
            );
            if (ok) return;
        }
        void fetch("/api/track", {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
            keepalive: true,
        }).catch(() => {});
    } catch {
        // La medición nunca rompe la tienda
    }
}

type TrackData = { productId?: string; query?: string; results?: number };

/** Clave para contar una sola vez por visita (vistas de producto y búsquedas). */
function onceKey(type: TrackEventType, data: TrackData): string | null {
    if (type === "product_view" && data.productId) return data.productId;
    if (type === "search" && data.query) return `s:${data.query.trim().toLowerCase()}`;
    return null;
}

export function track(type: TrackEventType, data: TrackData = {}) {
    if (typeof window === "undefined") return;

    try {
        const now = Date.now();
        const session = getSession(now);

        // Una vista por producto y una búsqueda por término en cada visita
        const key = onceKey(type, data);
        if (key) {
            if (session.viewed.includes(key)) {
                writeStorage(SESSION_KEY, JSON.stringify(session));
                return;
            }
            session.viewed = [...session.viewed, key].slice(-MAX_VIEWED_PRODUCTS);
        }

        writeStorage(SESSION_KEY, JSON.stringify(session));

        send({
            type,
            visitorId: getVisitorId(),
            sessionId: session.id,
            path: window.location.pathname,
            search: window.location.search.slice(0, 1000),
            productId: data.productId,
            query: data.query?.slice(0, 200),
            results: data.results,
            entry: session.entry,
        });
    } catch {
        // La medición nunca rompe la tienda
    }
}
