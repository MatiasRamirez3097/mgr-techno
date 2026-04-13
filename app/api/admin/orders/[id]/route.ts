import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
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

    await connectDB();
    const order = await OrderModel.findByIdAndUpdate(
        id,
        { status: body.status },
        { new: true },
    );

    if (!order)
        return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    return Response.json({ ok: true });
}
