import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReferenceSource } from "@/lib/priceReference/sources";
import { ReferenceBlockedError } from "@/services/priceReference/fetchReferencePage";
import type { ReferencePageOutcome } from "@/services/priceReference/fetchReferenceProduct";
import type { ReferencePassStore } from "@/services/priceReference/runReferencePass";

const fetchProduct = vi.fn<(url: string) => Promise<ReferencePageOutcome>>();
const fetchSitemap = vi.fn();
vi.mock("@/services/priceReference/fetchReferenceProduct", () => ({
    fetchReferenceProduct: (url: string) => fetchProduct(url),
}));
vi.mock("@/services/priceReference/fetchReferenceSitemap", () => ({
    fetchReferenceSitemap: () => fetchSitemap(),
}));

const { runReferencePass } = await import("@/services/priceReference/runReferencePass");

const source = { key: "test" } as ReferenceSource;
const options = { maxPages: 10, concurrency: 2, delayMs: 0, batchSize: 2 };
const ok = (url: string): ReferencePageOutcome => ({
    url,
    status: "ok",
    data: {
        name: url,
        sku: "",
        gtin: "",
        brand: "",
        image: null,
        price: 100,
        listPrice: 100,
        currency: "ARS",
        inStock: true,
        categoryPath: [],
    },
});

function makeStore(queues: { sitemapDue: boolean; urls: string[]; pending: number }[]) {
    const saved: ReferencePageOutcome[] = [];
    const store = {
        getQueue: vi.fn(async () => queues.shift()!),
        saveSitemap: vi.fn(async (entries: unknown[]) => ({ urls: entries.length, removed: 0 })),
        savePages: vi.fn(async (outcomes: ReferencePageOutcome[]) => {
            saved.push(...outcomes);
        }),
        finish: vi.fn(async () => {}),
    } satisfies ReferencePassStore;
    return { store, saved };
}

beforeEach(() => {
    fetchProduct.mockReset();
    fetchSitemap.mockReset();
});

describe("runReferencePass", () => {
    it("relee el sitemap si toca, pide la cola de nuevo y guarda todo en tandas", async () => {
        fetchSitemap.mockResolvedValue([{ loc: "a", lastmod: null }]);
        fetchProduct.mockImplementation(async (url) => ok(url));
        const { store, saved } = makeStore([
            { sitemapDue: true, urls: [], pending: 0 },
            { sitemapDue: false, urls: ["a", "b", "c"], pending: 5 },
        ]);

        const result = await runReferencePass(source, store, options);

        expect(store.saveSitemap).toHaveBeenCalledOnce();
        expect(store.getQueue).toHaveBeenCalledTimes(2);
        expect(saved.map((o) => o.url).sort()).toEqual(["a", "b", "c"]);
        expect(store.savePages).toHaveBeenCalledTimes(2);
        expect(result).toMatchObject({ status: "partial", fetched: 3, queued: 3, pending: 5 });
        expect(store.finish).toHaveBeenCalledWith({ status: "partial", fetched: 3 });
    });

    it("corta la pasada si el sitio bloquea y guarda lo leído hasta ahí", async () => {
        fetchProduct.mockImplementation(async (url) => {
            if (url === "c") throw new ReferenceBlockedError("bloqueado");
            return ok(url);
        });
        const { store, saved } = makeStore([
            { sitemapDue: false, urls: ["a", "b", "c", "d", "e"], pending: 0 },
        ]);

        const result = await runReferencePass(source, store, { ...options, concurrency: 1 });

        expect(saved.map((o) => o.url)).toEqual(["a", "b"]);
        expect(result).toMatchObject({ status: "error", message: "bloqueado", fetched: 2 });
    });

    it("registra el error si falla el sitemap", async () => {
        fetchSitemap.mockRejectedValue(new Error("sin sitemap"));
        const { store } = makeStore([{ sitemapDue: true, urls: [], pending: 0 }]);

        const result = await runReferencePass(source, store, options);

        expect(result).toMatchObject({ status: "error", message: "sin sitemap" });
        expect(store.finish).toHaveBeenCalledWith({ status: "error", fetched: 0, message: "sin sitemap" });
    });
});
