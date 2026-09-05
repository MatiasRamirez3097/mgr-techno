import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { recalculateOrderPaymentStatus } from "@/services/orders/recalculateOrderPaymentStatus";

// 🔥 AGREGAMOS LOS IMPORTS PARA EL EMAIL
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";

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

    // 1. Capturamos el estado general del pago ANTES de modificarlo
    const previousOrderPaymentStatus = order.paymentStatus;

    // 2. Modificamos el pago individual
    Object.assign(payment, body);

    if ("status" in body) {
        payment.paidAt = body.status === "paid" ? new Date() : null;
    }

    // 3. Recalculamos el estado general de la orden (esto muta 'order')
    recalculateOrderPaymentStatus(order);

    // 4. Capturamos el nuevo estado general
    const newOrderPaymentStatus = order.paymentStatus;

    await order.save();

    // 5. 🔥 DISPARAMOS EL EMAIL SI LA ORDEN PASÓ A ESTAR 100% PAGADA
    if (
        newOrderPaymentStatus === "paid" &&
        previousOrderPaymentStatus !== "paid"
    ) {
        try {
            const orderDTO = mapOrderToDTO(order);
            await sendPaymentConfirmedEmail(orderDTO);
            console.log(
                `✉️ Email de pago confirmado enviado para la orden ${order.id}`,
            );
        } catch (error) {
            // Lo envolvemos en un try-catch para que si falla el email,
            // no le tire un error 500 al panel de admin y la orden se guarde igual.
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
