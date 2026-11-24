import { describe, expect, it } from "vitest";
import {
    gtinCandidates,
    isGtinLike,
    normalizeScanCode,
    suggestCodeField,
} from "@/lib/scan/productCode";

describe("normalizeScanCode", () => {
    it("saca espacios y caracteres de control del lector", () => {
        expect(normalizeScanCode(" 7790 123\t456789\r\n")).toBe("7790123456789");
    });
});

describe("isGtinLike", () => {
    it("acepta GTIN-8, UPC-A, EAN-13 y GTIN-14", () => {
        for (const code of ["12345670", "012345678905", "7791234567890", "17791234567897"]) {
            expect(isGtinLike(code)).toBe(true);
        }
    });

    it("rechaza largos inválidos y códigos con letras", () => {
        expect(isGtinLike("1234567")).toBe(false);
        expect(isGtinLike("12345678901")).toBe(false);
        expect(isGtinLike("ACTCP00002A")).toBe(false);
    });
});

describe("gtinCandidates", () => {
    it("encuentra el mismo producto cargado como UPC-A o EAN-13", () => {
        const fromUpc = gtinCandidates("012345678905");
        expect(fromUpc).toContain("0012345678905");
        expect(gtinCandidates("0012345678905")).toContain("012345678905");
    });

    it("no agrega variantes más cortas que el número sin ceros", () => {
        expect(gtinCandidates("7791234567890")).toEqual(["7791234567890", "07791234567890"]);
    });

    it("deja los códigos no numéricos tal cual", () => {
        expect(gtinCandidates("MX4-2019")).toEqual(["MX4-2019"]);
    });
});

describe("suggestCodeField", () => {
    it("sugiere GTIN solo para códigos numéricos válidos", () => {
        expect(suggestCodeField("7791234567890")).toBe("gtin");
        expect(suggestCodeField("ACTCP00002A")).toBeNull();
    });
});
