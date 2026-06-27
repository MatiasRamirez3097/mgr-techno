import { quoteShipping } from "@/services/shipping/quoteShipping";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = await quoteShipping(body);
        return Response.json(result);
    } catch (error) {
        return Response.json(
            { error: "Error al cotizar envío" },
            { status: 500 },
        );
    }
}
