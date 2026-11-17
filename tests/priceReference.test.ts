import { describe, expect, it } from "vitest";
import {
    extractJsonLdBlocks,
    parseJsonLdProduct,
    parseSchemaPrice,
} from "@/lib/priceReference/jsonLdProduct";
import { parseSitemap } from "@/lib/priceReference/sitemap";

const page = (...blocks: unknown[]) =>
    `<html><head>${blocks
        .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
        .join("\n")}</head><body></body></html>`;

// Forma que publica WooCommerce: @graph con breadcrumb y producto, precio vigente y de lista
const wooProduct = {
    "@context": "https://schema.org/",
    "@graph": [
        {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, item: { name: "Cooling", "@id": "x" } },
                { "@type": "ListItem", position: 2, item: { name: "Cooler&nbsp;para Cpu", "@id": "y" } },
                { "@type": "ListItem", position: 3, item: { name: "Cooler X &amp; Y 240", "@id": "z" } },
            ],
        },
        {
            "@type": "Product",
            name: "Cooler X &amp; Y 240",
            sku: "CL-240-V1",
            image: "https://tienda.test/cooler.jpg",
            offers: [
                {
                    "@type": "Offer",
                    priceSpecification: [
                        { "@type": "UnitPriceSpecification", price: "221200.00", priceCurrency: "ARS" },
                        {
                            "@type": "UnitPriceSpecification",
                            price: "316000.00",
                            priceCurrency: "ARS",
                            priceType: "https://schema.org/ListPrice",
                        },
                    ],
                    availability: "https://schema.org/InStock",
                    price: "221200.00",
                    priceCurrency: "ARS",
                },
            ],
            brand: { "@type": "Brand", name: "Marca" },
        },
    ],
};

describe("parseSchemaPrice", () => {
    it("lee números y textos con punto decimal", () => {
        expect(parseSchemaPrice("221200.00")).toBe(221200);
        expect(parseSchemaPrice(1500.5)).toBe(1500.5);
    });

    it("acepta formato local con coma decimal", () => {
        expect(parseSchemaPrice("1.234,56")).toBe(1234.56);
    });

    it("devuelve null si no hay precio válido", () => {
        expect(parseSchemaPrice("")).toBeNull();
        expect(parseSchemaPrice("0")).toBeNull();
        expect(parseSchemaPrice(undefined)).toBeNull();
    });
});

describe("extractJsonLdBlocks", () => {
    it("ignora bloques con JSON inválido", () => {
        const html = `<script type="application/ld+json">{roto</script>${page({ a: 1 })}`;
        expect(extractJsonLdBlocks(html)).toEqual([{ a: 1 }]);
    });
});

describe("parseJsonLdProduct", () => {
    it("lee un producto de WooCommerce con precio vigente y de lista", () => {
        expect(parseJsonLdProduct(page(wooProduct))).toEqual({
            name: "Cooler X & Y 240",
            sku: "CL-240-V1",
            gtin: "",
            brand: "Marca",
            image: "https://tienda.test/cooler.jpg",
            price: 221200,
            listPrice: 316000,
            currency: "ARS",
            inStock: true,
            categoryPath: ["Cooling", "Cooler para Cpu"],
        });
    });

    it("sin precio de lista usa el vigente", () => {
        const data = parseJsonLdProduct(
            page({
                "@type": "Product",
                name: "Mouse",
                mpn: "M-1",
                gtin13: "7791234567890",
                offers: { "@type": "Offer", price: 15000, availability: "https://schema.org/OutOfStock" },
            }),
        );
        expect(data).toMatchObject({
            sku: "M-1",
            gtin: "7791234567890",
            price: 15000,
            listPrice: 15000,
            inStock: false,
        });
    });

    it("toma el precio más bajo de un AggregateOffer", () => {
        const data = parseJsonLdProduct(
            page({
                "@type": ["Product"],
                name: "Memoria",
                offers: { "@type": "AggregateOffer", lowPrice: "50000", highPrice: "80000" },
            }),
        );
        expect(data?.price).toBe(50000);
    });

    it("devuelve null sin producto o sin precio", () => {
        expect(parseJsonLdProduct(page({ "@type": "Organization", name: "Tienda" }))).toBeNull();
        expect(parseJsonLdProduct(page({ "@type": "Product", name: "Sin precio" }))).toBeNull();
        expect(parseJsonLdProduct("<html></html>")).toBeNull();
    });
});

describe("parseSitemap", () => {
    it("lee un índice de sitemaps", () => {
        const xml = `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://t.test/wp-sitemap-posts-product-1.xml</loc></sitemap><sitemap><loc>https://t.test/wp-sitemap-posts-page-1.xml</loc></sitemap></sitemapindex>`;
        expect(parseSitemap(xml).map((e) => e.loc)).toEqual([
            "https://t.test/wp-sitemap-posts-product-1.xml",
            "https://t.test/wp-sitemap-posts-page-1.xml",
        ]);
    });

    it("lee URLs con fecha de modificación", () => {
        const xml = `<urlset><url><loc>https://t.test/producto/a/?x=1&amp;y=2</loc><lastmod>2026-11-13T15:11:30-03:00</lastmod></url><url><loc>https://t.test/producto/b/</loc></url><url><lastmod>2026-01-01</lastmod></url></urlset>`;
        const entries = parseSitemap(xml);
        expect(entries).toHaveLength(2);
        expect(entries[0].loc).toBe("https://t.test/producto/a/?x=1&y=2");
        expect(entries[0].lastmod?.toISOString()).toBe("2026-11-13T18:11:30.000Z");
        expect(entries[1].lastmod).toBeNull();
    });
});
