import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";

const VALID_STATUSES = ["pending", "paid", "failed", "refunded"];

export async function PATCH(
    req: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            id: string;
            paymentId: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { id, paymentId } = await params;

        const body = await req.json();

        const status = body.status;

        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                {
                    error: "Estado inválido",
                },
                {
                    status: 400,
                },
            );
        }

        const order = await OrderModel.findOne({
            _id: id,
            "payments._id": paymentId,
        });

        if (!order) {
            return NextResponse.json(
                {
                    error: "Pago no encontrado",
                },
                {
                    status: 404,
                },
            );
        }

        const payment = order.payments.find((p: any) => p.id === paymentId);

        if (!payment) {
            return NextResponse.json(
                {
                    error: "Pago no encontrado",
                },
                {
                    status: 404,
                },
            );
        }

        payment.status = status;

        if (status === "paid") {
            payment.paidAt = new Date();
        } else {
            payment.paidAt = null;
        }

        await order.save();

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.log(error);

        return NextResponse.json(
            {
                error: "Error interno",
            },
            {
                status: 500,
            },
        );
    }
}
