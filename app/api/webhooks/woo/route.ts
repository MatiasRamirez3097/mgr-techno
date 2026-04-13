import { NextRequest } from "next/server";
import { syncProduct, deleteProduct, syncCategories } from "@/lib/sync";
import crypto from "crypto";

function verifySignature(
    body: string,
    signature: string,
    secret: string,
): boolean {
    const hash = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("base64");
    return hash === signature;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-wc-webhook-signature") || "";
        const topic = req.headers.get("x-wc-webhook-topic") || "";

        // Verificar firma
        const secret = process.env.WOO_WEBHOOK_SECRET!;
        if (!verifySignature(body, signature, secret)) {
            return Response.json({ error: "Firma inválida" }, { status: 401 });
        }

        const product = JSON.parse(body);

        if (topic === "product.deleted") {
            await deleteProduct(product.id);
        } else if (topic.startsWith("product.")) {
            await syncProduct(product);
        } else if (topic.startsWith("product_cat.")) {
            // Resincronizar todas las categorías cuando cambia alguna
            await syncCategories();
        }

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> webhook error:", e);
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}
