import { NextRequest } from "next/server";
import { syncProduct, deleteProduct } from "@/lib/sync";
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
            console.log(`>>> Producto ${product.id} eliminado de MongoDB`);
        } else {
            // product.created o product.updated
            await syncProduct(product);
            console.log(`>>> Producto ${product.id} sincronizado en MongoDB`);
        }

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> webhook error:", e);
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}
