import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { NextRequest } from "next/server";
import { startSession } from "mongoose";

import {
    sendOrderShippedEmail,
    sendReadyForPickupEmail,
    sendOrderCompletedEmail,
    sendOrderCancelledEmail,
} from "@/lib/email";

import { reverseInventoryAllocation } from "@/services/inventory/reverseInventoryAllocation";
import { updateProductStock } from "@/services/products/updateProductStock";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await req.json();

    // El estado de pago sólo cambia registrando un pago
    // (POST /api/admin/orders/[id]/payments → recalculateOrderPaymentStatus)
    if (body.paymentStatus !== undefined) {
        return Response.json(
            {
                error: "El estado de pago no se edita directamente: registrá un pago.",
            },
            { status: 400 },
        );
    }

    await connectDB();

    const session = await startSession();
    try {
        session.startTransaction();
        const order = await OrderModel.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return Response.json(
                { error: "Orden no encontrada" },
                { status: 404 },
            );
        }

        const wasCancelled = order.status === "cancelled";
        const oldStatus = order.status;

        let emailToSend:
            | "shipped"
            | "ready"
            | "completed"
            | "cancelled"
            | null = null;

        const targetStatus = body.status || order.status;

        const advancedStates = [
            "processing",
            "shipped",
            "ready_for_pickup",
            "completed",
        ];
        const isCash = order.payments?.some(
            (p: { method?: string }) => p.method === "cash",
        );
        if (
            advancedStates.includes(targetStatus) &&
            order.paymentStatus !== "paid" &&
            !isCash
        ) {
            await session.abortTransaction();
            return Response.json(
                {
                    error: "No se puede avanzar el estado del pedido porque el pago no está confirmado.",
                },
                { status: 400 },
            );
        }

        const finalStatus = targetStatus;

        if (finalStatus !== oldStatus) {
            const willBeCancelled = finalStatus === "cancelled";

            if (!wasCancelled && willBeCancelled) {
                if (order.inventoryAllocatedAt) {
                    await reverseInventoryAllocation(order.id, session);
                } else {
                    for (const item of order.items) {
                        await updateProductStock(
                            item.productId,
                            item.quantity,
                            -item.quantity,
                            session,
                            item.isBundle &&
                                Array.isArray(item.bundleComponents) &&
                                item.bundleComponents.length > 0
                                ? item.bundleComponents
                                : undefined,
                        );
                    }
                }

                emailToSend = "cancelled";
            } else if (wasCancelled && !willBeCancelled) {
                for (const item of order.items) {
                    await updateProductStock(
                        item.productId,
                        -item.quantity,
                        item.quantity,
                        session,
                        item.isBundle &&
                            Array.isArray(item.bundleComponents) &&
                            item.bundleComponents.length > 0
                            ? item.bundleComponents
                            : undefined,
                    );
                }
            }

            if (finalStatus === "shipped") emailToSend = "shipped";
            if (finalStatus === "ready_for_pickup") emailToSend = "ready";
            if (finalStatus === "completed") emailToSend = "completed";

            order.status = finalStatus;
        }

        await order.save({ session });
        await session.commitTransaction();

        try {
            if (emailToSend === "shipped") {
                await sendOrderShippedEmail(order);
            } else if (emailToSend === "ready") {
                await sendReadyForPickupEmail(order);
            } else if (emailToSend === "completed") {
                await sendOrderCompletedEmail(order);
            } else if (emailToSend === "cancelled") {
                await sendOrderCancelledEmail(order);
            }
        } catch (emailError) {
            console.error(
                "Error silencioso enviando notificaciones por email:",
                emailError,
            );
        }

        return Response.json({ ok: true });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error en PUT Order:", error);
        return Response.json(
            { error: "Error actualizando orden" },
            { status: 500 },
        );
    } finally {
        session.endSession();
    }
}
