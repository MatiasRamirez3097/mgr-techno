import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validators/createOrderSchema";
import { createOrder } from "@/lib/orders/createOrder";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();

        // 🔥 VALIDACIÓN
        const dataWithEmail = {
            ...body,
            customerEmail: session.user.email,
            customerId: session.customerId,
        };
        const result = createOrderSchema.safeParse(dataWithEmail);
        if (!result.success) {
            console.log(">error", result.error);
            return Response.json(
                {
                    success: false,
                    error: "Datos inválidos",
                    details: result.error,
                },
                { status: 400 },
            );
        }
        // 🔥 SERVICE
        const order = await createOrder(result.data);

        return NextResponse.json(order);
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.log(error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
