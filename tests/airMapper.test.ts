import { describe, expect, it } from "vitest";
import {
    decodeAirText,
    getAirStockLabel,
    isIncompleteAirList,
    mapAirRow,
    parseAirCsv,
    parseAirRubros,
} from "@/lib/distributors/airMapper";

const HEADER =
    '﻿"Codigo","Descripcion","lista3","Tipo","IVA","ROS","MZA","CBA","LUG","Grupo","Rubro","Part Number" ';

describe("decodeAirText", () => {
    it("usa UTF-8 cuando el contenido es válido", () => {
        expect(decodeAirText(new TextEncoder().encode("Radiación"))).toBe("Radiación");
    });

    it("cae a Windows-1252 cuando no es UTF-8 válido", () => {
        // "Ó" en Windows-1252 es 0xD3
        expect(decodeAirText(new Uint8Array([0x52, 0x41, 0x44, 0xd3, 0x4e]))).toBe("RADÓN");
    });
});

describe("parseAirCsv", () => {
    it("lee el encabezado con BOM y las filas por nombre de columna", () => {
        const csv = [
            HEADER,
            '"39580","ACCESS POINT Aruba AP-505","440.56","A","10.5","3","0","0","22","605","001-0612","R2H28A"',
        ].join("\r\n");
        const { rows, skipped } = parseAirCsv(csv);
        expect(skipped).toBe(0);
        expect(rows).toHaveLength(1);
        expect(rows[0]["Codigo"]).toBe("39580");
        expect(rows[0]["Part Number"]).toBe("R2H28A");
    });

    it("tolera comillas sin escapar dentro de la descripción", () => {
        const csv = [
            HEADER,
            '"27148","PANEL CIEGO GLC 1U 19"","5.96","A","21","0","0","0","4","141","001-1055","R-1025"',
        ].join("\n");
        const { rows } = parseAirCsv(csv);
        expect(rows[0]["Descripcion"]).toBe('PANEL CIEGO GLC 1U 19"');
        expect(rows[0]["lista3"]).toBe("5.96");
        expect(rows[0]["Part Number"]).toBe("R-1025");
    });

    it("descarta las filas con columnas de más o de menos", () => {
        const csv = [HEADER, '"1","SOLO DOS"', ""].join("\n");
        expect(parseAirCsv(csv)).toEqual({ rows: [], skipped: 1 });
    });
});

describe("mapAirRow", () => {
    const names = parseAirRubros(
        JSON.stringify([
            { id: 0, name: "Todos los Rubros", grupos: [] },
            {
                id: "001-0612",
                name: "CONECTIVIDAD WI-FI ANTENAS",
                grupos: [
                    { id: 0, name: "Todos los Grupos" },
                    { id: 605, name: "Hewlett Packard Enterprise" },
                ],
            },
        ]),
    );

    const row = {
        Codigo: "39580",
        Descripcion: " ACCESS POINT  Aruba AP-505 ",
        lista3: "440.56",
        Tipo: "A",
        IVA: "10.5",
        ROS: "3",
        MZA: "0",
        CBA: "0",
        LUG: "22",
        Grupo: "605",
        Rubro: "001-0612",
        "Part Number": "R2H28A",
    };

    it("suma el IVA al precio de lista y usa el stock de Rosario", () => {
        const item = mapAirRow(row, names)!;
        expect(item.price).toBe(440.56);
        expect(item.finalPrice).toBe(486.82);
        expect(item.ivaPercent).toBe(10.5);
        expect(item.currency).toBe("USD");
        expect(item.stock).toBe(3);
        expect(item.stockByWarehouse).toEqual({ ROS: 3, MZA: 0, CBA: 0, LUG: 22 });
    });

    it("resuelve rubro y marca por nombre y limpia la descripción", () => {
        const item = mapAirRow(row, names)!;
        expect(item.title).toBe("ACCESS POINT Aruba AP-505");
        expect(item.brand).toBe("Hewlett Packard Enterprise");
        expect(item.category).toBe("CONECTIVIDAD WI-FI ANTENAS");
        expect(item.categoryId).toBe("001-0612");
        expect(item.searchText).toContain("r2h28a");
    });

    it("usa el código de rubro si no hay nombre y descarta precios inválidos", () => {
        expect(mapAirRow({ ...row, Rubro: "001-9999" }, names)!.category).toBe("001-9999");
        expect(mapAirRow({ ...row, lista3: "0" }, names)).toBeNull();
        expect(mapAirRow({ ...row, lista3: "A" }, names)).toBeNull();
        expect(mapAirRow({ ...row, Codigo: "" }, names)).toBeNull();
    });
});

describe("parseAirRubros", () => {
    it("ignora las opciones 'Todos' y un JSON inválido", () => {
        const names = parseAirRubros('[{"id":0,"name":"Todos","grupos":[{"id":0,"name":"Todos"}]}]');
        expect(names.rubros.size).toBe(0);
        expect(names.grupos.size).toBe(0);
        expect(parseAirRubros("<html>").rubros.size).toBe(0);
    });
});

describe("getAirStockLabel", () => {
    it("sólo informa leyenda cuando no hay stock en Rosario", () => {
        expect(getAirStockLabel({ ROS: 2, LUG: 10 })).toBeUndefined();
        expect(getAirStockLabel({ ROS: 0, MZA: 1, LUG: 10 })).toBe(
            "Sin stock en ROS (otros depósitos: 11)",
        );
        expect(getAirStockLabel({ ROS: 0 })).toBeUndefined();
    });
});

describe("isIncompleteAirList", () => {
    it("rechaza una lista con menos de la mitad de artículos que la anterior", () => {
        expect(isIncompleteAirList(12, 3025)).toBe(true);
        expect(isIncompleteAirList(2800, 3025)).toBe(false);
    });

    it("acepta cualquier lista si no hay una anterior comparable", () => {
        expect(isIncompleteAirList(12, 0)).toBe(false);
        expect(isIncompleteAirList(12, null)).toBe(false);
        expect(isIncompleteAirList(12, 50)).toBe(false);
    });
});
