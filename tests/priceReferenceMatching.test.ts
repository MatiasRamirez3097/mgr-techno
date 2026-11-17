import { describe, expect, it } from "vitest";
import { buildNameIndex } from "@/lib/distributors/nameMatching";
import {
    findReferenceCodeMatches,
    indexReferenceItemsByCode,
    referencePriceDiff,
    suggestReferenceMatches,
    type ReferenceMatchItem,
} from "@/lib/priceReference/referenceMatching";

const item = (id: string, name: string, sku = "", gtin = "", source = "a"): ReferenceMatchItem => ({
    id,
    source,
    name,
    sku,
    gtin,
});

const catalog = [
    item("1", "Switch Tp-Link 8 Puertos SF1008D", "TL-SF1008D"),
    item("2", "Mother Asus Prime B450M-A AM4", "90MB0YR0-MVAAYC"),
    item("3", "Webcam Logitech C270 HD", "960-000694", "5099206064225"),
    item("4", "Webcam Logitech C270 HD (otra publicación)", "960 000694"),
    item("5", "Mouse Logitech G203 Lightsync Negro", ""),
    item("6", "Mother Asus Prime B450M-A AM4", "90MB0YR0-MVAAYC", "", "b"),
    item("7", "Teclado Logitech G213 Prodigy", ""),
];
const codeIndex = indexReferenceItemsByCode(catalog);
const nameIndex = buildNameIndex(catalog);

describe("findReferenceCodeMatches", () => {
    it("cruza el part number del producto (mpn o sku) con el SKU de la tienda, sin guiones", () => {
        const matches = findReferenceCodeMatches({ name: "x", mpn: "TLSF1008D" }, codeIndex);
        expect(matches.get("a")?.map((m) => [m.item.id, m.method])).toEqual([["1", "part_number"]]);
    });

    it("agrupa por tienda", () => {
        const matches = findReferenceCodeMatches({ name: "x", sku: "90MB0YR0-MVAAYC" }, codeIndex);
        expect([...matches.keys()].sort()).toEqual(["a", "b"]);
    });

    it("cruza el EAN con el GTIN y no repite un ítem que ya coincidió por part number", () => {
        const byEan = findReferenceCodeMatches({ name: "x", gtin: "5099206064225" }, codeIndex);
        expect(byEan.get("a")?.map((m) => [m.item.id, m.method])).toEqual([["3", "ean"]]);

        const both = findReferenceCodeMatches({ name: "x", mpn: "960-000694", gtin: "5099206064225" }, codeIndex);
        // Dos publicaciones con el mismo part number: queda ambiguo (lo resuelve el admin)
        expect(both.get("a")?.map((m) => m.item.id).sort()).toEqual(["3", "4"]);
    });

    it("ignora códigos demasiado cortos", () => {
        expect(findReferenceCodeMatches({ name: "x", sku: "C270" }, codeIndex).size).toBe(0);
    });
});

describe("suggestReferenceMatches", () => {
    it("sugiere por nombre en las tiendas sin coincidencia por código", () => {
        const matches = suggestReferenceMatches(
            { name: "Mouse Gamer Logitech G203 Lightsync RGB" },
            codeIndex,
            nameIndex,
            ["a", "b"],
        );
        expect(matches.map((m) => [m.item.id, m.method])).toEqual([["5", "name"]]);
        expect(matches[0].score).toBeGreaterThan(0.5);
    });

    it("no sugiere por nombre en una tienda que ya tiene coincidencia por código", () => {
        const matches = suggestReferenceMatches(
            { name: "Mother Asus Prime B450M-A", mpn: "90MB0YR0-MVAAYC" },
            codeIndex,
            nameIndex,
            ["a"],
        );
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({ method: "part_number", item: { id: "2" } });
    });

    it("sólo sugiere en las tiendas pedidas", () => {
        const matches = suggestReferenceMatches({ name: "x", sku: "90MB0YR0-MVAAYC" }, codeIndex, nameIndex, ["b"]);
        expect(matches.map((m) => m.item.id)).toEqual(["6"]);
    });
});

describe("referencePriceDiff", () => {
    it("es positiva si somos más caros y negativa si más baratos", () => {
        expect(referencePriceDiff(110, 100)).toBeCloseTo(0.1);
        expect(referencePriceDiff(90, 100)).toBeCloseTo(-0.1);
    });

    it("devuelve null sin alguno de los precios", () => {
        expect(referencePriceDiff(100, null)).toBeNull();
        expect(referencePriceDiff(0, 100)).toBeNull();
    });
});
