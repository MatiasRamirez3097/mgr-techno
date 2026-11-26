import { describe, expect, it } from "vitest";
import {
    classifyPage,
    classifySource,
    isExternalEntry,
    regionLabel,
} from "@/lib/analytics/classify";
import { trackEventSchema } from "@/lib/validators/trackEventSchema";

describe("classifyPage", () => {
    it.each([
        ["/", "", "home"],
        ["/ofertas-del-dia", "", "ofertas-del-dia"],
        ["/ofertas-del-dia/", "", "ofertas-del-dia"],
        ["/productos/ofertas", "", "ofertas"],
        ["/productos/categoria/placas-de-video", "", "categoria"],
        ["/productos", "", "catalogo"],
        ["/productos", "?search=rtx%204060", "busqueda"],
        ["/productos", "?search=%20", "catalogo"],
        ["/productos/mouse-logitech-g203", "?utm_source=hardgamers", "producto"],
        ["/checkout", "", "checkout"],
        ["/checkout/success", "?id=1", "compra"],
        ["/mi-cuenta/pedidos", "", "cuenta"],
        ["/envios", "", "otra"],
    ])("%s%s → %s", (path, search, expected) => {
        expect(classifyPage(path, search)).toBe(expected);
    });
});

describe("classifySource", () => {
    it("sin datos es directo", () => {
        expect(classifySource(null)).toMatchObject({ channel: "direct", source: "" });
        expect(classifySource({ referrer: "" })).toMatchObject({ channel: "direct" });
    });

    it("la propia tienda y Mercado Pago no cuentan como origen", () => {
        expect(classifySource({ referrer: "https://www.mgrtechno.com.ar/productos" }).channel).toBe("direct");
        expect(classifySource({ referrer: "https://www.mercadopago.com.ar/checkout/v1" }))
            .toMatchObject({ channel: "direct", referrerHost: "" });
    });

    it("buscadores", () => {
        expect(classifySource({ referrer: "https://www.google.com.ar/" }))
            .toMatchObject({ channel: "organic_search", source: "google", referrerHost: "google.com.ar" });
        expect(classifySource({ referrer: "https://duckduckgo.com/" }).source).toBe("duckduckgo");
        expect(classifySource({ referrer: "android-app://com.google.android.googlequicksearchbox/" }).source)
            .toBe("google");
    });

    it("redes sociales", () => {
        expect(classifySource({ referrer: "https://l.instagram.com/" }))
            .toMatchObject({ channel: "social", source: "instagram" });
        expect(classifySource({ referrer: "https://lm.facebook.com/", fbclid: true }))
            .toMatchObject({ channel: "social", source: "facebook" });
        expect(classifySource({ fbclid: true })).toMatchObject({ channel: "social", source: "meta" });
        expect(classifySource({ referrer: "https://t.co/abc" }).source).toBe("twitter");
    });

    it("publicidad paga: gclid o utm_medium pago", () => {
        expect(classifySource({ gclid: true, referrer: "https://www.google.com/" }))
            .toMatchObject({ channel: "paid", source: "google" });
        expect(classifySource({ utmSource: "Instagram", utmMedium: "paid_social", fbclid: true }))
            .toMatchObject({ channel: "paid", source: "instagram", medium: "paid_social" });
        expect(classifySource({ utmMedium: "cpc", fbclid: true })).toMatchObject({ channel: "paid", source: "meta" });
    });

    it("comparadores por utm (feeds) o por sitio de origen", () => {
        expect(classifySource({ utmSource: "hardgamers", utmMedium: "comparador" }))
            .toMatchObject({ channel: "comparator", source: "hardgamers" });
        expect(classifySource({ utmSource: "buscahard" }).channel).toBe("comparator");
        expect(classifySource({ referrer: "https://www.hardgamers.com.ar/search?text=rtx" }))
            .toMatchObject({ channel: "comparator", source: "hardgamers" });
        expect(classifySource({ utmSource: "google", utmMedium: "shopping" }))
            .toMatchObject({ channel: "comparator", source: "google" });
    });

    it("email y otros sitios", () => {
        expect(classifySource({ utmSource: "resend", utmMedium: "email" }).channel).toBe("email");
        expect(classifySource({ referrer: "android-app://com.google.android.gm/" }).channel).toBe("email");
        expect(classifySource({ referrer: "https://mail.google.com/" }).source).toBe("gmail");
        expect(classifySource({ referrer: "https://foro.ejemplo.com/hilo/1" }))
            .toMatchObject({ channel: "referral", source: "foro.ejemplo.com" });
        expect(classifySource({ utmSource: "Influencer_Juan", utmCampaign: "Black Friday" }))
            .toMatchObject({ channel: "referral", source: "influencer_juan", campaign: "black friday" });
    });
});

describe("isExternalEntry", () => {
    it("distingue llegadas de afuera de la navegación interna", () => {
        expect(isExternalEntry({ referrer: "https://www.google.com/" })).toBe(true);
        expect(isExternalEntry({ utmSource: "hardgamers" })).toBe(true);
        expect(isExternalEntry({ gclid: true })).toBe(true);
        expect(isExternalEntry({ referrer: "https://mgrtechno.com.ar/" })).toBe(false);
        expect(isExternalEntry({ referrer: "https://www.mercadopago.com.ar/" })).toBe(false);
        expect(isExternalEntry({ referrer: null })).toBe(false);
        expect(isExternalEntry(null)).toBe(false);
    });
});

describe("regionLabel", () => {
    it("provincias argentinas, exterior y desconocida", () => {
        expect(regionLabel("AR", "S")).toBe("Santa Fe");
        expect(regionLabel("AR", "c")).toBe("CABA");
        expect(regionLabel("AR", "")).toBe("Argentina (sin provincia)");
        expect(regionLabel("UY", "MO")).toBe("Exterior (UY)");
        expect(regionLabel("", "")).toBe("Desconocida");
    });
});

describe("trackEventSchema", () => {
    const base = {
        visitorId: "4f6c1d2e-1111-4222-8333-944455556666",
        sessionId: "9a8b7c6d-1111-4222-8333-944455556666",
        path: "/productos/x",
    };

    it("acepta una vista de página sin producto", () => {
        expect(trackEventSchema.safeParse({ ...base, type: "page_view" }).success).toBe(true);
    });

    it("exige producto en vistas de producto y agregados", () => {
        expect(trackEventSchema.safeParse({ ...base, type: "add_to_cart" }).success).toBe(false);
        expect(
            trackEventSchema.safeParse({ ...base, type: "product_view", productId: "64b7f0c2a1b2c3d4e5f60718" })
                .success,
        ).toBe(true);
        expect(trackEventSchema.safeParse({ ...base, type: "product_view", productId: "nope" }).success).toBe(false);
    });

    it("rechaza rutas que no empiezan con /", () => {
        expect(trackEventSchema.safeParse({ ...base, path: "https://otro.com", type: "page_view" }).success)
            .toBe(false);
    });
});

describe("report helpers", () => {
    it("rango de días y parseo", async () => {
        const { lastDays, addDays, parseAnalyticsRange, startOfStoreDay } = await import("@/lib/analytics/report");
        expect(parseAnalyticsRange("7")).toBe(7);
        expect(parseAnalyticsRange("15")).toBe(30);
        expect(parseAnalyticsRange(undefined)).toBe(30);
        expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
        expect(lastDays("2026-11-26", 3)).toEqual(["2026-11-24", "2026-11-25", "2026-11-26"]);
        expect(lastDays("2026-11-26", 30)).toHaveLength(30);
        expect(startOfStoreDay("2026-11-26").toISOString()).toBe("2026-11-26T03:00:00.000Z");
    });

    it("tabla de productos: une contadores, calcula porcentajes y ordena", async () => {
        const { addProductCount, buildProductRows, percentOf } = await import("@/lib/analytics/report");
        const counts = new Map();
        addProductCount(counts, "a", "views", 100);
        addProductCount(counts, "a", "adds", 10);
        addProductCount(counts, "a", "units", 2);
        addProductCount(counts, "b", "views", 50);
        addProductCount(counts, "b", "adds", 20);
        addProductCount(counts, "c", "units", 1);
        const names = new Map([
            ["a", { name: "Mouse", slug: "mouse" }],
            ["b", { name: "Teclado", slug: "teclado" }],
        ]);

        const byViews = buildProductRows(counts, names, "views", 10);
        expect(byViews.map((r) => r.id)).toEqual(["a", "b"]);
        expect(byViews[0]).toMatchObject({ name: "Mouse", addRate: 10, buyRate: 20 });
        expect(byViews[1]).toMatchObject({ addRate: 40, buyRate: 0 });

        expect(buildProductRows(counts, names, "adds", 1).map((r) => r.id)).toEqual(["b"]);
        const byUnits = buildProductRows(counts, names, "units", 10);
        expect(byUnits.map((r) => r.id)).toEqual(["a", "c"]);
        expect(byUnits[1]).toMatchObject({ name: "Producto eliminado", slug: null, addRate: null, buyRate: null });
        expect(percentOf(1, 3)).toBe(33);
        expect(percentOf(1, 0)).toBeNull();
    });
});
