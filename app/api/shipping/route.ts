import { NextRequest } from "next/server";
import { cotizarAndreani } from "@/lib/andreani";

export async function POST(req: NextRequest) {
    try {
        const { postcode, items } = await req.json();

        if (!postcode || postcode.length < 4) {
            return Response.json(
                { error: "Código postal inválido" },
                { status: 400 },
            );
        }

        const result = await cotizarAndreani(postcode, items);

        if (result.error) {
            return Response.json({ error: result.error }, { status: 422 });
        }

        return Response.json({ total: result.total });
    } catch {
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}
