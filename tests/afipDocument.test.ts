import { describe, expect, it } from "vitest";
import { getAfipDocument } from "@/lib/afip/utils/mapDocumentType";

describe("getAfipDocument", () => {
    it("mapea DNI, CUIT y CUIL a sus códigos AFIP", () => {
        expect(
            getAfipDocument({ documentType: "DNI", number: "30123456" }),
        ).toEqual({ type: 96, number: 30123456 });
        expect(
            getAfipDocument({ documentType: "cuit", number: "20-30123456-7" }),
        ).toEqual({ type: 80, number: 20301234567 });
        expect(
            getAfipDocument({ documentType: "CUIL", number: "27301234561" }),
        ).toEqual({ type: 86, number: 27301234561 });
    });

    it("sin número o tipo desconocido es Consumidor Final con DocNro 0", () => {
        expect(getAfipDocument({ documentType: "DNI", number: "" })).toEqual({
            type: 99,
            number: 0,
        });
        expect(
            getAfipDocument({ documentType: "PASAPORTE", number: "123" }),
        ).toEqual({ type: 99, number: 0 });
        expect(getAfipDocument(undefined)).toEqual({ type: 99, number: 0 });
    });
});
