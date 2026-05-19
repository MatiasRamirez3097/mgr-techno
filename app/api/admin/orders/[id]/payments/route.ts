import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    await connectDB();

    const { id } = await params;

    const body = await req.json();

    const order = await OrderModel.findById(id);

    if (!order) {
        return NextResponse.json(
            { error: "Orden no encontrada" },
            { status: 404 },
        );
    }

    order.payments.push({
        ...body,

        paidAt: body.status === "paid" ? new Date() : null,
    });

    await order.save();

    return NextResponse.json({
        success: true,
    });
}
