import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import { startSession } from "mongoose";

import { sendPaymentConfirmedEmail } from "@/lib/email";
import { reverseInventoryAllocation } from "@/lib/inventory/reverseInventoryAllocation";
import { updateProductStock } from "@/lib/products/updateProductStock";

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

        const wasCancelled = order.status === "cancelled";
        if (body.status) {
            const willBeCancelled = body.status === "cancelled";

            if (!wasCancelled && willBeCancelled) {
                if (order.inventoryAllocatedAt)
                    await reverseInventoryAllocation(order.id, session);
                else {
                    for (const item of order.items) {
                        await updateProductStock(
                            item.productId,
                            item.quantity,
                            -item.quantity,
                            session,
                        );
                    }
                }
            } else if (body.status !== "cancelled" && wasCancelled) {
                for (const item of order.items) {
                    await updateProductStock(
                        item.productId,
                        -item.quantity,
                        item.quantity,
                        session,
                    );
                }
            }

            order.status = body.status;
        } else if (body.paymentStatus) {
            order.paymentStatus = body.paymentStatus;
            //if (order.paymentMethod === "bacs" && body.paymentStatus === "paid")
            //    order.status = "processing";
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
