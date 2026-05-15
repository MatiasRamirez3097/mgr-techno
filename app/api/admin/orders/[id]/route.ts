import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import { startSession } from "mongoose";

import { sendPaymentConfirmedEmail } from "@/lib/email";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await req.json();

    await connectDB();

    const session = await startSession();
    try {
        session.startTransaction();
        const order = await OrderModel.findById(id);
        if (!order) {
            await session.abortTransaction();

            return Response.json(
                { error: "Orden no encontrada" },
                { status: 404 },
            );
        }
        console.log("body>>>", body);
        const wasCancelled = order.status === "cancelled";
        if (body.status) {
            const willBeCancelled = body.status === "cancelled";

            if (!wasCancelled && willBeCancelled) {
                for (const item of order.items) {
                    console.log(">>>item", item);
                    await ProductModel.findByIdAndUpdate(
                        item.productId,
                        {
                            $inc: {
                                availableStock: item.quantity,
                            },
                        },
                        { session },
                    );
                }
            }

            order.status = body.status;
        } else if (body.paymentStatus && !wasCancelled) {
            order.paymentStatus = body.paymentStatus;
            if (order.paymentMethod === "bacs" && body.paymentStatus === "paid")
                order.status = "processing";
        }
        await order.save({ session });

        await session.commitTransaction();
        if (body.paymentStatus === "paid")
            await sendPaymentConfirmedEmail(order);
        return Response.json({ ok: true });
    } catch (error) {
        await session.abortTransaction();

        console.error(error);

        return Response.json(
            { error: "Error actualizando orden" },
            { status: 500 },
        );
    } finally {
        session.endSession();
    }
}
/*const order = await OrderModel.findByIdAndUpdate(
        id,
        { status: body.status },
        { new: true },
    );

    if (!order)
        return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    return Response.json({ ok: true });
    */
