import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { WOO_HEADERS_JSON } from "@/lib/woo";
import { NextRequest } from "next/server";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/orders/${id}`,
        {
            method: "PUT",
            headers: WOO_HEADERS_JSON,
            body: JSON.stringify(body),
        },
    );

    if (!res.ok)
        return Response.json({ error: "Error al actualizar" }, { status: 500 });
    return Response.json({ ok: true });
}
