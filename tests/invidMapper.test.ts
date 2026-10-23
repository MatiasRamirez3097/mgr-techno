import { describe, expect, it } from "vitest";
import {
    buildCategoryNamePattern,
    buildInvidProductUrl,
    convertToArs,
    hasSignificantPriceChange,
    isUsdCurrency,
    mapInvidArticle,
    mapInvidStock,
    parseInvidNumber,
} from "@/lib/distributors/invidMapper";

describe("parseInvidNumber", () => {
    it("acepta números y textos con punto decimal", () => {
        expect(parseInvidNumber(150.5)).toBe(150.5);
        expect(parseInvidNumber("150000.00")).toBe(150000);
        expect(parseInvidNumber("123.45")).toBe(123.45);
    });

    it("acepta formato con coma decimal y separador de miles", () => {
        expect(parseInvidNumber("1.234,56")).toBe(1234.56);
        expect(parseInvidNumber("1,234.56")).toBe(1234.56);
        expect(parseInvidNumber("123,45")).toBe(123.45);
        expect(parseInvidNumber("1.234.567")).toBe(1234567);
        expect(parseInvidNumber("1,234")).toBe(1234);
    });

    it("ignora símbolos y devuelve 0 si no es un número", () => {
        expect(parseInvidNumber("U$S 99.90")).toBe(99.9);
        expect(parseInvidNumber("")).toBe(0);
        expect(parseInvidNumber(null)).toBe(0);
        expect(parseInvidNumber("abc")).toBe(0);
    });
});

describe("isUsdCurrency", () => {
    it("reconoce las variantes de dólar", () => {
        for (const c of ["USD", "U$S", "u$s", "US$", "Dólar"]) {
            expect(isUsdCurrency(c)).toBe(true);
        }
        expect(isUsdCurrency("ARS")).toBe(false);
        expect(isUsdCurrency("$")).toBe(false);
        expect(isUsdCurrency("")).toBe(false);
    });
});

describe("mapInvidStock", () => {
    it("usa STOCK numérico cuando viene", () => {
        expect(mapInvidStock(8, "Disponible")).toEqual({
            stock: 8,
            stockStatus: "Disponible",
            available: true,
        });
        expect(mapInvidStock("0", "Sin stock").available).toBe(false);
    });

    it("usa STOCK_STATUS cuando no hay permiso para ver cantidades", () => {
        for (const status of [
            "Disponible",
            "Stock bajo",
            "Menos de 10 unidades",
        ]) {
            expect(mapInvidStock(undefined, status)).toEqual({
                stock: null,
                stockStatus: status,
                available: true,
            });
        }
        expect(mapInvidStock(undefined, "Sin stock").available).toBe(false);
        expect(mapInvidStock(null, "").available).toBe(false);
    });
});

describe("mapInvidArticle", () => {
    const raw = {
        ID: "ART-001",
        TITLE: "Placa de Video RTX-4060 8GB",
        PRICE: "300.00",
        FINAL_PRICE: "363.00",
        CURRENCY: "USD",
        PART_NUMBER: "RTX4060-O8G",
        EAN: "",
        BRAND: "Asus",
        STOCK_STATUS: "Stock bajo",
        IVA_PERCENT: 10.5,
        IMAGE_URL: "https://example.com/a.jpg",
        CATEGORY_ID: "120",
        CATEGORY: "Placas de Video",
        CATEGORIES: [
            {
                ID: "120",
                NAME: "Placas de Video",
                IS_PRIMARY: true,
                PARENT: { ID: "1", NAME: "Componentes" },
            },
        ],
    };

    it("normaliza precio, stock, categorías y texto de búsqueda", () => {
        const item = mapInvidArticle(raw)!;
        expect(item.invidId).toBe("ART-001");
        expect(item.finalPrice).toBe(363);
        expect(item.price).toBe(300);
        expect(item.stock).toBeNull();
        expect(item.available).toBe(true);
        expect(item.categoryIds).toEqual(["120", "1"]);
        expect(item.categoryNames).toEqual(["placas de video", "componentes"]);
        expect(item.searchText).toContain("rtx4060");
        expect(item.searchText).toContain("asus");
    });

    it("reconstruye el precio final si no viene FINAL_PRICE", () => {
        const item = mapInvidArticle({
            ...raw,
            FINAL_PRICE: undefined,
            IVA_PERCENT: 21,
        })!;
        expect(item.finalPrice).toBe(363);
    });

    it("descarta artículos sin ID o sin título", () => {
        expect(mapInvidArticle({ ...raw, ID: undefined })).toBeNull();
        expect(mapInvidArticle({ ...raw, TITLE: "" })).toBeNull();
    });
});

describe("hasSignificantPriceChange", () => {
    it("detecta variaciones del 2% o más en cualquier sentido", () => {
        expect(hasSignificantPriceChange(100, 102)).toBe(true);
        expect(hasSignificantPriceChange(100, 97)).toBe(true);
        expect(hasSignificantPriceChange(100, 101.9)).toBe(false);
        expect(hasSignificantPriceChange(null, 100)).toBe(false);
        expect(hasSignificantPriceChange(0, 100)).toBe(false);
    });
});

describe("convertToArs", () => {
    it("convierte sólo los precios en dólares", () => {
        expect(convertToArs(363, "USD", 1550)).toBe(562650);
        expect(convertToArs(1000, "ARS", 1550)).toBe(1000);
    });
});

describe("buildCategoryNamePattern", () => {
    const matches = (name: string, category: string) =>
        new RegExp(buildCategoryNamePattern(name)!).test(category);

    it("ignora plurales, mayúsculas y conectores", () => {
        expect(matches("Procesadores", "procesador")).toBe(true);
        expect(matches("Procesador", "procesadores amd")).toBe(true);
        expect(matches("Placas de Video", "placa video")).toBe(true);
        expect(matches("Mother", "motherboards")).toBe(true);
        expect(matches("SSD", "discos ssd")).toBe(true);
        expect(matches("GABINETES", "gabinete")).toBe(true);
    });

    it("exige todas las palabras al comienzo de una palabra", () => {
        expect(matches("Placas de Video", "placas madre")).toBe(false);
        expect(matches("SSD", "hdd")).toBe(false);
        expect(matches("Memorias", "inmemorias")).toBe(false);
    });

    it("devuelve null si no hay palabras útiles", () => {
        expect(buildCategoryNamePattern("de")).toBeNull();
        expect(buildCategoryNamePattern("")).toBeNull();
    });
});

describe("buildInvidProductUrl", () => {
    it("arma el slug del título y agrega el ID de Invid", () => {
        expect(buildInvidProductUrl("Teclado Genius LuxeMate 120 Black USB (3951)", "0418057")).toBe(
            "https://www.invidcomputers.com/teclado-genius-luxemate-120-black-usb-3951---det--0418057",
        );
        expect(buildInvidProductUrl("Teclado+Mouse Kelyx USB Cableado Negro (7107)", "0417313")).toBe(
            "https://www.invidcomputers.com/teclado-mouse-kelyx-usb-cableado-negro-7107---det--0417313",
        );
    });

    it("quita acentos y no arma link sin ID", () => {
        expect(buildInvidProductUrl("Cámara Ñandú", "0400001")).toBe(
            "https://www.invidcomputers.com/camara-nandu---det--0400001",
        );
        expect(buildInvidProductUrl("Sin ID", "")).toBeNull();
    });
});
