import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session)
        return Response.json({ error: "No autorizado" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    // Verificamos la contraseña actual intentando obtener un JWT
    const verifyRes = await fetch(
        `${process.env.WOO_URL}/wp-json/jwt-auth/v1/token`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: session.user?.email,
                password: currentPassword,
            }),
        },
    );

    if (!verifyRes.ok) {
        return Response.json(
            { error: "La contraseña actual es incorrecta" },
            { status: 400 },
        );
    }

    const customerId = (session as any).customerId;

    // Actualizamos la contraseña via WooCommerce API
    const updateRes = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/customers/${customerId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${process.env.WOO_KEY}:${process.env.WOO_SECRET}`,
                    ).toString("base64"),
            },
            body: JSON.stringify({ password: newPassword }),
        },
    );

    if (!updateRes.ok)
        return Response.json(
            { error: "Error al actualizar la contraseña" },
            { status: 500 },
        );
    return Response.json({ ok: true });
}
