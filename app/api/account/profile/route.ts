import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { WOO_HEADERS } from "@/lib/woo";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session)
        return Response.json({ error: "No autorizado" }, { status: 401 });

    const customerId = (session as any).customerId;
    if (!customerId)
        return Response.json(
            { error: "Cliente no encontrado" },
            { status: 404 },
        );

    const body = await req.json();

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/customers/${customerId}`,
        {
            method: "PUT",
            headers: WOO_HEADERS,
            body: JSON.stringify({
                billing: {
                    first_name: body.first_name,
                    last_name: body.last_name,
                    address_1: body.address_1,
                    city: body.city,
                    state: body.state,
                    postcode: body.postcode,
                    phone: body.phone,
                    country: "AR",
                },
                meta_data: [
                    {
                        key: "billing_tipo_documento",
                        value: body.tipo_documento,
                    },
                    {
                        key: "billing_numero_documento",
                        value: body.numero_documento,
                    },
                ],
            }),
        },
    );

    if (!res.ok)
        return Response.json({ error: "Error al actualizar" }, { status: 500 });
    return Response.json({ ok: true });
}
