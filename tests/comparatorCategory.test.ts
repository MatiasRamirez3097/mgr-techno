import { describe, expect, it } from "vitest";
import { comparatorCategorySchema } from "@/lib/validators/comparatorCategorySchema";
import {
    DEFAULT_COMPARATOR_CATEGORIES,
    toNewBytesCategoryParam,
} from "@/lib/distributors/comparatorCategoryDefaults";

describe("comparatorCategorySchema", () => {
    it("normaliza la clave y limpia valores vacíos o repetidos", () => {
        const parsed = comparatorCategorySchema.parse({
            key: " video ",
            name: "Placas de Video",
            elit: [
                { paramType: "sub_categoria", value: "Placas de Video" },
                { paramType: "sub_categoria", value: "placas de video" },
                { paramType: "categoria", value: "Placas de Video" },
            ],
            newbytes: ["PLACA-DE-VIDEO", " ", "PLACA-DE-VIDEO"],
            invid: ["120", "120", "172"],
        });

        expect(parsed.key).toBe("VIDEO");
        expect(parsed.order).toBe(0);
        expect(parsed.active).toBe(true);
        expect(parsed.elit).toHaveLength(2);
        expect(parsed.newbytes).toEqual(["PLACA-DE-VIDEO"]);
        expect(parsed.invid).toEqual(["120", "172"]);
    });

    it("rechaza claves con espacios o sin nombre", () => {
        expect(
            comparatorCategorySchema.safeParse({ key: "PLACAS VIDEO", name: "X" }).success,
        ).toBe(false);
        expect(comparatorCategorySchema.safeParse({ key: "VIDEO", name: " " }).success).toBe(
            false,
        );
    });

    it("los valores iniciales son válidos y sin claves repetidas", () => {
        const keys = DEFAULT_COMPARATOR_CATEGORIES.map(
            (c) => comparatorCategorySchema.parse(c).key,
        );
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe("toNewBytesCategoryParam", () => {
    it("reemplaza espacios por guiones y respeta los valores con guiones", () => {
        expect(toNewBytesCategoryParam("PLACA DE VIDEO")).toBe("PLACA-DE-VIDEO");
        expect(toNewBytesCategoryParam(" CASA  INTELIGENTE ")).toBe("CASA-INTELIGENTE");
        expect(toNewBytesCategoryParam("MOTHER-ASUS")).toBe("MOTHER-ASUS");
    });
});
