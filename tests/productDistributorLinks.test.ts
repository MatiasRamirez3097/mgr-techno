import { describe, expect, it } from "vitest";
import {
    buildLooseCodeRegex,
    candidatesFromIndex,
    distributorItemKey,
    findCodeMatches,
    indexItemsByCode,
    marginOverCost,
    normalizeEan,
    normalizePartNumber,
    productMatchCodes,
    toDistributorKey,
    type CodeMatchItem,
} from "@/lib/distributors/productLinks";
import { createDistributorLinkSchema } from "@/lib/validators/distributorLinkSchema";

type Item = CodeMatchItem & { id: string };

const items: Item[] = [
    { id: "i1", distributor: "invid", partNumber: "RTX-4060 8G", ean: "0012345678905" },
    { id: "i2", distributor: "invid", partNumber: "OTRO-12345", ean: "" },
    { id: "a1", distributor: "air", partNumber: "rtx40608g", ean: "" },
    { id: "a2", distributor: "air", partNumber: "RTX4060-8G", ean: "" },
    { id: "a3", distributor: "air", partNumber: "ABC", ean: "" },
];

describe("normalización de códigos", () => {
    it("ignora mayúsculas, espacios y símbolos", () => {
        expect(normalizePartNumber(" rtx-4060 8g ")).toBe("RTX40608G");
    });

    it("descarta códigos demasiado cortos", () => {
        expect(normalizePartNumber("A-12")).toBe("");
        expect(normalizePartNumber(null)).toBe("");
    });

    it("EAN: sólo dígitos, sin ceros a la izquierda de más", () => {
        expect(normalizeEan("0012345678905")).toBe("12345678905");
        expect(normalizeEan("12345678905")).toBe("12345678905");
        expect(normalizeEan("123")).toBe("");
    });

    it("usa mpn y sku del producto sin duplicar", () => {
        expect(productMatchCodes({ mpn: "RTX-4060-8G", sku: "rtx40608g" })).toEqual(["RTX40608G"]);
    });

    it("el regex encuentra el código con separadores", () => {
        const regex = buildLooseCodeRegex("RTX40608G");
        expect(regex.test("RTX-4060 8G")).toBe(true);
        expect(regex.test("rtx40608g")).toBe(true);
        expect(regex.test("RTX40608GB")).toBe(false);
    });
});

describe("findCodeMatches", () => {
    it("agrupa por distribuidor las coincidencias por part number", () => {
        const matches = findCodeMatches({ mpn: "RTX4060 8G" }, items);
        expect(matches.get("invid")?.map((m) => m.item.id)).toEqual(["i1"]);
        expect(matches.get("air")?.map((m) => m.item.id)).toEqual(["a1", "a2"]);
        expect(matches.get("invid")?.[0].method).toBe("part_number");
    });

    it("coincide por EAN cuando el part number no", () => {
        const matches = findCodeMatches({ mpn: "NADA-99999", gtin: "12345678905" }, items);
        expect(matches.get("invid")?.[0]).toMatchObject({ method: "ean", matchedValue: "0012345678905" });
        expect(matches.has("air")).toBe(false);
    });

    it("no compara códigos cortos", () => {
        expect(findCodeMatches({ sku: "ABC" }, items).size).toBe(0);
    });
});

describe("índice por código", () => {
    it("devuelve los mismos candidatos que la búsqueda directa", () => {
        const index = indexItemsByCode(items);
        const ids = candidatesFromIndex({ sku: "rtx-40608g", gtin: "0012345678905" }, index).map((i) => i.id);
        expect(ids.sort()).toEqual(["a1", "a2", "i1"]);
    });
});

describe("helpers", () => {
    it("claves de distribuidor", () => {
        expect(toDistributorKey("INVID")).toBe("invid");
        expect(toDistributorKey("NewBytes")).toBe("newbytes");
        expect(toDistributorKey("Otro")).toBeNull();
        expect(distributorItemKey("Elit", 123)).toBe("elit:123");
    });

    it("margen sobre el costo", () => {
        expect(marginOverCost(120, 100)).toBeCloseTo(0.2);
        expect(marginOverCost(90, 100)).toBeCloseTo(-0.1);
        expect(marginOverCost(100, 0)).toBeNull();
        expect(marginOverCost(100, null)).toBeNull();
    });
});

describe("createDistributorLinkSchema", () => {
    it("normaliza el distribuidor y el ID", () => {
        const parsed = createDistributorLinkSchema.parse({
            distributor: "INVID",
            distributorProductId: 123,
            name: "RTX 4060",
            price: 300000,
        });
        expect(parsed).toMatchObject({
            distributor: "invid",
            distributorProductId: "123",
            matchMethod: "manual",
            stock: null,
            link: null,
        });
    });

    it("rechaza distribuidores desconocidos", () => {
        expect(createDistributorLinkSchema.safeParse({ distributor: "x", distributorProductId: "1", name: "a" }).success).toBe(
            false,
        );
    });
});
