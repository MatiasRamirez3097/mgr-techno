import { describe, expect, it } from "vitest";
import { BusinessError, isBusinessError } from "@/lib/errors/BusinessError";

describe("BusinessError", () => {
    it("usa 409 por defecto y conserva el mensaje", () => {
        const error = new BusinessError("Sin stock para Mouse");
        expect(error.status).toBe(409);
        expect(error.message).toBe("Sin stock para Mouse");
    });

    it("distingue errores de negocio de errores genéricos", () => {
        expect(isBusinessError(new BusinessError("x", 400))).toBe(true);
        expect(isBusinessError(new Error("x"))).toBe(false);
        expect(isBusinessError("x")).toBe(false);
    });
});
