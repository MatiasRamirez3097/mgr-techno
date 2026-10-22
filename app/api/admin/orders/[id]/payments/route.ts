import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { orderPaymentSchema } from "@/lib/validators/orderPaymentSchema";
import { recalculateOrderPaymentStatus } from "@/services/orders/recalculateOrderPaymentStatus";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    await connectDB();

    const { id } = await params;

    const parsed = orderPaymentSchema.safeParse(await req.json());

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos de pago inválidos" },
            { status: 400 },
        );
    }

    const order = await OrderModel.findById(id);

    if (!order) {
        return NextResponse.json(
            { error: "Orden no encontrada" },
            { status: 404 },
        );
    }

    const previousOrderPaymentStatus = order.paymentStatus;

    order.payments.push({
        ...parsed.data,
        paidAt: parsed.data.status === "paid" ? new Date() : null,
    });

    recalculateOrderPaymentStatus(order);

    await order.save();

    // Mismo comportamiento que PATCH: avisamos si la orden quedó 100% pagada
    if (
        order.paymentStatus === "paid" &&
        previousOrderPaymentStatus !== "paid"
    ) {
        try {
            await sendPaymentConfirmedEmail(mapOrderToDTO(order));
        } catch (error) {
            console.error(
                "❌ Error enviando email de confirmación de pago:",
                error,
            );
        }
    }

    return NextResponse.json({
        success: true,
    });
}
