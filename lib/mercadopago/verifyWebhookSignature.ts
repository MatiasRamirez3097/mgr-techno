import crypto from "crypto";

export type SignatureCheck = "valid" | "invalid" | "unsigned" | "not_configured";

/**
 * Valida el header x-signature de los webhooks de Mercado Pago.
 * Manifiesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (se omiten las partes ausentes),
 * firmado con HMAC-SHA256 usando la clave secreta del panel de MP (MP_WEBHOOK_SECRET).
 */
export function verifyMercadoPagoSignature(params: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
}): SignatureCheck {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return "not_configured";

    const { xSignature, xRequestId, dataId } = params;
    // Las notificaciones IPN no traen firma
    if (!xSignature) return "unsigned";

    let ts: string | undefined;
    let v1: string | undefined;

    for (const part of xSignature.split(",")) {
        const [key, value] = part.split("=").map((s) => s?.trim());
        if (key === "ts") ts = value;
        if (key === "v1") v1 = value;
    }

    if (!ts || !v1) return "invalid";

    // MP indica pasar a minúsculas los ids alfanuméricos
    const normalizedId = dataId ? dataId.toLowerCase() : null;

    let manifest = "";
    if (normalizedId) manifest += `id:${normalizedId};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    manifest += `ts:${ts};`;

    const expected = crypto
        .createHmac("sha256", secret)
        .update(manifest)
        .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(v1, "hex");

    if (
        expectedBuf.length !== receivedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
        return "invalid";
    }

    return "valid";
}
