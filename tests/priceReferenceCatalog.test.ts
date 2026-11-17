import { describe, expect, it } from "vitest";
import {
    buildCatalogProductUrl,
    mapCatalogProduct,
    parseCatalog,
    parseCatalogCodes,
} from "@/lib/priceReference/catalogJson";
import type { CatalogReferenceSource } from "@/lib/priceReference/sources";

const source: CatalogReferenceSource = {
    key: "cat",
    label: "Tienda",
    shortLabel: "T",
    type: "catalog-json",
    baseUrl: "https://tienda.test",
    catalogUrl: "https://static.tienda.test/productos",
    imageBaseUrl: "https://img.tienda.test/p_",
};

// Forma de cada producto del catálogo
const raw = {
    id_producto: 1674,
    nombre: "Estabilizador Desktop TCA-1200N LYONN AV",
    id_categoria: 5,
    id_subcategoria: 31,
    precioEspecial: 42890,
    precioLista: 47656,
    precioEspecialAnterior: null,
    imagenes: [
        { nombre: "1228_segunda", orden: 2 },
        { nombre: "1226_Estabilizador_Desktop", orden: 1 },
    ],
    vendible: 1,
    stock: 10,
    codigo: "disponible",
    codigo_principal: ["SKU: TCA-1200NV"],
    es_outlet: false,
    visible_solo_en_ATPC: false,
    visible_solo_en_combo: false,
};

describe("buildCatalogProductUrl", () => {
    it("arma la URL como su tienda: nombre con _ en vez de símbolos y el ID", () => {
        expect(buildCatalogProductUrl("https://t.test", "1705", "Cable Power 0,75mm 1,5mts 100% Cobre")).toBe(
            "https://t.test/producto/Cable_Power_0_75mm_1_5mts_100_Cobre_1705",
        );
    });
});

describe("parseCatalogCodes", () => {
    it("separa SKU y EAN según el prefijo", () => {
        expect(parseCatalogCodes(["SKU: TCA-1200NV", "EAN: 7791234567890"])).toEqual({
            sku: "TCA-1200NV",
            gtin: "7791234567890",
        });
    });

    it("sin prefijo toma el valor como SKU", () => {
        expect(parseCatalogCodes(["90MB0YR0-MVAAYC"])).toEqual({ sku: "90MB0YR0-MVAAYC", gtin: "" });
        expect(parseCatalogCodes(null)).toEqual({ sku: "", gtin: "" });
    });
});

describe("mapCatalogProduct", () => {
    it("mapea precio especial, de lista, stock, código, URL e imagen", () => {
        expect(mapCatalogProduct(raw, source)).toEqual({
            externalId: "1674",
            url: "https://tienda.test/producto/Estabilizador_Desktop_TCA_1200N_LYONN_AV_1674",
            data: {
                name: "Estabilizador Desktop TCA-1200N LYONN AV",
                sku: "TCA-1200NV",
                gtin: "",
                brand: "",
                image: "https://img.tienda.test/p_1226_Estabilizador_Desktop-mini.jpg",
                price: 42890,
                listPrice: 47656,
                currency: "ARS",
                inStock: true,
                categoryPath: [],
            },
        });
    });

    it("sin stock si no es vendible o el stock es 0", () => {
        expect(mapCatalogProduct({ ...raw, vendible: 0 }, source)?.data.inStock).toBe(false);
        expect(mapCatalogProduct({ ...raw, stock: 0 }, source)?.data.inStock).toBe(false);
    });

    it("descarta outlet, productos sólo para combos o armador, y sin precio", () => {
        expect(mapCatalogProduct({ ...raw, es_outlet: true }, source)).toBeNull();
        expect(mapCatalogProduct({ ...raw, visible_solo_en_ATPC: true }, source)).toBeNull();
        expect(mapCatalogProduct({ ...raw, visible_solo_en_combo: true }, source)).toBeNull();
        expect(mapCatalogProduct({ ...raw, precioEspecial: 0 }, source)).toBeNull();
        expect(mapCatalogProduct({ ...raw, id_categoria: 55 }, source)).toBeNull();
    });

    it("guarda los paquetes con \" + \" sin código, para no vincularlos con el producto suelto", () => {
        const bundle = mapCatalogProduct({ ...raw, nombre: "Notebook X + Mouse G305", codigo_principal: ["SKU: 910-005281"] }, source);
        expect(bundle?.data).toMatchObject({ sku: "", gtin: "", name: "Notebook X + Mouse G305" });
    });
});

describe("parseCatalog", () => {
    it("acepta el arreglo o un objeto con data, sin repetir IDs", () => {
        expect(parseCatalog([raw, raw, { ...raw, id_producto: 2 }], source)).toHaveLength(2);
        expect(parseCatalog({ data: [raw] }, source)).toHaveLength(1);
        expect(parseCatalog("nada", source)).toEqual([]);
    });
});
