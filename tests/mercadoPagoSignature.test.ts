import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/verifyWebhookSignature";

const SECRET = "test-secret";

function sign(manifest: string) {
    return crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("verifyMercadoPagoSignature", () => {
    it("devuelve not_configured sin MP_WEBHOOK_SECRET", () => {
        vi.stubEnv("MP_WEBHOOK_SECRET", "");
        expect(
            verifyMercadoPagoSignature({
                xSignature: "ts=1,v1=abc",
                xRequestId: "req",
                dataId: "123",
            }),
        ).toBe("not_configured");
    });

    it("acepta una firma válida", () => {
        vi.stubEnv("MP_WEBHOOK_SECRET", SECRET);
        const v1 = sign("id:abc123;request-id:req-1;ts:1700000000;");
        expect(
            verifyMercadoPagoSignature({
                xSignature: `ts=1700000000,v1=${v1}`,
                xRequestId: "req-1",
                dataId: "ABC123",
            }),
        ).toBe("valid");
    });

    it("rechaza firma alterada o mal formada", () => {
        vi.stubEnv("MP_WEBHOOK_SECRET", SECRET);
        const v1 = sign("id:123;request-id:req-1;ts:1700000000;");
        expect(
            verifyMercadoPagoSignature({
                xSignature: `ts=1700000000,v1=${v1}`,
                xRequestId: "req-1",
                dataId: "999",
            }),
        ).toBe("invalid");
        expect(
            verifyMercadoPagoSignature({
                xSignature: "ts=1700000000",
                xRequestId: "req-1",
                dataId: "123",
            }),
        ).toBe("invalid");
    });

    it("marca como unsigned una notificación sin firma (IPN)", () => {
        vi.stubEnv("MP_WEBHOOK_SECRET", SECRET);
        expect(
            verifyMercadoPagoSignature({
                xSignature: null,
                xRequestId: null,
                dataId: "123",
            }),
        ).toBe("unsigned");
    });
});
