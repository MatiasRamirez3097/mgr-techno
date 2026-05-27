import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { recalculateOrderPaymentStatus } from "@/services/orders/recalculateOrderPaymentStatus";

export async function PATCH(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            id: string;
            paymentId: string;
        }>;
    },
) {
    await connectDB();

    const { id, paymentId } = await params;

    const body = await req.json();

    const order = await OrderModel.findById(id);

    if (!order) {
        return NextResponse.json(
            { error: "Orden no encontrada" },
            { status: 404 },
        );
    }

    const payment = order.payments.id(paymentId);

    if (!payment) {
        return NextResponse.json(
            { error: "Pago no encontrado" },
            { status: 404 },
        );
    }

    Object.assign(payment, body);

    if ("status" in body) {
        payment.paidAt = body.status === "paid" ? new Date() : null;
    }

    recalculateOrderPaymentStatus(order);

    await order.save();

    return NextResponse.json({
        success: true,
    });
}

export async function DELETE(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            id: string;
            paymentId: string;
        }>;
    },
) {
    await connectDB();

    const { id, paymentId } = await params;

    const order = await OrderModel.findById(id);

    if (!order) {
        return NextResponse.json(
            { error: "Orden no encontrada" },
            { status: 404 },
        );
    }

    order.payments.pull(paymentId);

    recalculateOrderPaymentStatus(order);

    await order.save();

    return NextResponse.json({
        success: true,
    });
}
