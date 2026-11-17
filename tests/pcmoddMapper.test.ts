import { describe, expect, it } from "vitest";
import {
    buildSheetCsvUrl,
    parseCsv,
    parsePcmoddSheet,
    pcmoddDisplayName,
    pcmoddItemId,
} from "@/lib/distributors/pcmoddMapper";

// Forma de la hoja: encabezado de marca con títulos, productos y filas en blanco
const sheet = [
    "ID-COOLING ,USD,IVA",
    'ID-COOLING FROST X55 Core 4G,"$1,00","21,00"',
    'FROST CLEANER X40,"$12,50","21,00"',
    ",,",
    'DX360 MAX,"$1.234,56","10,50"',
    'FX240 PRO ,"$99,90","10,50"',
    ",,",
    "THERMALRIGHT,,",
    'Peerless Assassin 120 SE,"$35,00","10,50"',
    'Precio raro,"$abc1x","10,50"',
].join("\r\n");

describe("parseCsv", () => {
    it("respeta comillas, comas dentro de campos y CRLF", () => {
        expect(parseCsv('a,"b,c","d ""e"""\r\nf,,\n')).toEqual([
            ["a", "b,c", 'd "e"'],
            ["f", "", ""],
        ]);
    });
});

describe("buildSheetCsvUrl", () => {
    it("arma la descarga en CSV con el gid de la pestaña", () => {
        expect(buildSheetCsvUrl("https://docs.google.com/spreadsheets/d/AbC-123_x/edit?gid=987#gid=987")).toBe(
            "https://docs.google.com/spreadsheets/d/AbC-123_x/export?format=csv&gid=987",
        );
    });

    it("sin gid usa la primera pestaña; sin ID devuelve null", () => {
        expect(buildSheetCsvUrl("https://docs.google.com/spreadsheets/d/XYZ/edit")).toContain("gid=0");
        expect(buildSheetCsvUrl("https://example.com")).toBeNull();
    });
});

describe("parsePcmoddSheet", () => {
    const { items, skipped } = parsePcmoddSheet(sheet);

    it("asigna a cada producto la marca del encabezado anterior", () => {
        expect(items.map((i) => [i.title, i.brand])).toEqual([
            ["ID-COOLING FROST X55 Core 4G", "ID-COOLING"],
            ["FROST CLEANER X40", "ID-COOLING"],
            ["DX360 MAX", "ID-COOLING"],
            ["FX240 PRO", "ID-COOLING"],
            ["Peerless Assassin 120 SE", "THERMALRIGHT"],
        ]);
    });

    it("lee precios con coma decimal y miles, y suma el IVA de la columna C", () => {
        const dx = items.find((i) => i.title === "DX360 MAX")!;
        expect(dx).toMatchObject({ price: 1234.56, ivaPercent: 10.5, currency: "USD" });
        expect(dx.finalPrice).toBeCloseTo(1364.19, 2);
        expect(items[0]).toMatchObject({ price: 1, ivaPercent: 21, finalPrice: 1.21 });
    });

    it("la búsqueda incluye la marca aunque el nombre no la tenga", () => {
        expect(items.find((i) => i.title === "DX360 MAX")!.searchText).toBe("idcooling dx360 max");
        expect(items[0].searchText).toBe("idcooling frost x55 core 4g");
    });

    it("cuenta como no leídas las filas con algo raro en el precio", () => {
        expect(skipped).toBe(1);
    });

    it("IDs estables por marca y nombre", () => {
        expect(items[2].pcmoddId).toBe(pcmoddItemId("ID-COOLING", "DX360 MAX"));
        expect(pcmoddItemId("ID-COOLING", "DX360 MAX")).toBe("idcooling-dx360-max");
    });
});

describe("pcmoddDisplayName", () => {
    it("agrega la marca si el nombre no la tiene", () => {
        expect(pcmoddDisplayName("DX360 MAX", "ID-COOLING")).toBe("DX360 MAX (ID-COOLING)");
        expect(pcmoddDisplayName("ID-COOLING FROST X55", "ID-COOLING")).toBe("ID-COOLING FROST X55");
    });
});
