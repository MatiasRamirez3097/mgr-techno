import { describe, expect, it } from "vitest";
import {
    MIN_NAME_SIMILARITY,
    buildNameIndex,
    findNameMatches,
    hasConflictingSpecs,
    isModelToken,
    nameSimilarity,
    nameTokens,
} from "@/lib/distributors/nameMatching";

const sim = (a: string, b: string) => nameSimilarity(nameTokens(a), nameTokens(b));

describe("nameTokens", () => {
    it("normaliza acentos, símbolos y une número con unidad", () => {
        expect(nameTokens("Memoria RAM Kingston Fury 8 GB DDR4-3200")).toEqual([
            "memoria", "ram", "kingston", "fury", "8gb", "ddr4", "3200",
        ]);
    });

    it("descarta palabras de relleno", () => {
        expect(nameTokens("Placa de Video para el PC con RGB")).toEqual(["placa", "video", "pc", "rgb"]);
    });
});

describe("isModelToken", () => {
    it("reconoce modelos y descarta especificaciones", () => {
        expect(isModelToken("4060")).toBe(true);
        expect(isModelToken("b550m")).toBe(true);
        expect(isModelToken("12400f")).toBe(true);
        expect(isModelToken("8gb")).toBe(false);
        expect(isModelToken("650w")).toBe(false);
        expect(isModelToken("5")).toBe(false);
        expect(isModelToken("msi")).toBe(false);
    });
});

describe("nameSimilarity", () => {
    it("acepta el mismo producto escrito distinto", () => {
        expect(
            sim("Placa de Video MSI GeForce RTX 4060 Ventus 2X 8GB", "VGA MSI RTX 4060 VENTUS 2X BLACK 8G OC"),
        ).toBeGreaterThanOrEqual(MIN_NAME_SIMILARITY);
        expect(
            sim("Procesador Intel Core i5 12400F", "Micro Intel Core i5-12400F 4.4GHz Socket 1700 sin cooler"),
        ).toBeGreaterThanOrEqual(MIN_NAME_SIMILARITY);
    });

    it("rechaza modelos distintos", () => {
        expect(sim("Placa de Video MSI RTX 4060 Ventus", "Placa de Video MSI RTX 4070 Ventus")).toBe(0);
        expect(sim("Mother ASUS Prime B550M-A", "Mother ASUS Prime B650M-A")).toBe(0);
    });

    it("rechaza marcas distintas", () => {
        expect(sim("Mother MSI H510M Plus V3", "MOTHER GIGABYTE (LGA1200) H510M S2H V3")).toBe(0);
        expect(sim("Memoria Corsair Vengeance 16GB DDR5", "Memoria Kingston KVR 16GB DDR5")).toBe(0);
    });

    it("rechaza otro chipset, socket o tipo de producto", () => {
        expect(sim("Mother Gigabyte B560M DS3H AC LGA1200", "MOTHER GIGABYTE (AM4) A520M DS3H AC")).toBe(0);
        expect(sim("Mouse Trust Ziva", "Teclado Gamer LED Trust Ziva")).toBe(0);
        expect(sim("Micro AMD Athlon 3000G AM4", "PC CX AMD ATHLON 3000G+16G+SSD480")).toBe(0);
        expect(sim("Mother ASUS Prime B650M-A II AM5", "MOTHER ASUS (AM5) PRIME B650M-A II")).toBeGreaterThan(0.9);
    });

    it("ignora el ID que Invid agrega al final", () => {
        expect(nameTokens("Memoria DDR4 HIKSEMI 16Gb 3200 MHz Hiker (7222)")).not.toContain("7222");
    });

    it("rechaza otra capacidad del mismo modelo", () => {
        expect(sim("Kingston Fury Beast 8GB DDR4 3200", "Kingston Fury Beast 16GB DDR4 3200")).toBe(0);
        expect(hasConflictingSpecs(nameTokens("Fuente 650W"), nameTokens("Fuente 750 W"))).toBe(true);
        expect(hasConflictingSpecs(nameTokens("SSD 1TB"), nameTokens("SSD 1 TB NVMe"))).toBe(false);
    });

    it("sin palabras de modelo en común no sugiere", () => {
        expect(sim("Mouse Logitech inalámbrico negro", "Teclado Logitech inalámbrico negro")).toBe(0);
    });
});

describe("findNameMatches", () => {
    const items = [
        { id: "a", name: "VGA MSI RTX 4060 VENTUS 2X 8G OC" },
        { id: "b", name: "VGA MSI RTX 4060 TI VENTUS 2X 8G" },
        { id: "c", name: "VGA MSI RTX 4070 VENTUS 2X 12G" },
        { id: "d", name: "Mouse Logitech G203" },
        { id: "e", name: "Placa de Video MSI GeForce RTX 4060 VENTUS 2X OC 8GB" },
    ];
    const index = buildNameIndex(items);

    it("ordena por similitud y respeta el límite y el filtro", () => {
        const matches = findNameMatches("Placa de Video MSI GeForce RTX 4060 Ventus 2X OC 8GB", index);
        // La 4060 Ti (b) y la 4070 (c) son otros productos
        expect(matches.map((m) => m.item.id)).toEqual(["e", "a"]);
        expect(matches[0].score).toBeGreaterThan(matches[1].score);

        expect(findNameMatches("MSI RTX 4060 Ventus 2X 8GB", index, { limit: 1 })).toHaveLength(1);
        const filtered = findNameMatches("MSI RTX 4060 Ventus 2X 8GB", index, { filter: (i) => i.id !== "e" });
        expect(filtered[0].item.id).toBe("a");
        expect(filtered.some((m) => m.item.id === "e")).toBe(false);
    });
});
