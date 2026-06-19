import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { NextRequest } from "next/server";
import { startSession } from "mongoose";

// 1. IMPORTAMOS TODAS LAS FUNCIONES DE EMAIL
import {
    sendPaymentConfirmedEmail,
    sendOrderShippedEmail,
    sendReadyForPickupEmail,
    sendOrderCompletedEmail,
} from "@/lib/email";

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
        const wasPaid = order.paymentStatus === "paid";
        const oldStatus = order.status;

        let justBecamePaid = false;
        let emailToSend: "shipped" | "ready" | "completed" | null = null;

        // ==========================================
        // EVALUAR NUEVOS ESTADOS OBJETIVO
        // ==========================================
        const targetPaymentStatus = body.paymentStatus || order.paymentStatus;
        const targetStatus = body.status || order.status;

        // REGLA DE NEGOCIO: Bloqueo por falta de pago
        const advancedStates = [
            "processing",
            "shipped",
            "ready_for_pickup",
            "completed",
        ];
        if (
            advancedStates.includes(targetStatus) &&
            targetPaymentStatus !== "paid" &&
            order.paymentMethod?.method !== "cash"
        ) {
            await session.abortTransaction();
            return Response.json(
                {
                    error: "No se puede avanzar el estado del pedido porque el pago no está confirmado.",
                },
                { status: 400 },
            );
        }

        // ==========================================
        // ACTUALIZAR PAGO
        // ==========================================
        if (body.paymentStatus && body.paymentStatus !== order.paymentStatus) {
            order.paymentStatus = body.paymentStatus;

            if (body.paymentStatus === "paid" && !wasPaid) {
                justBecamePaid = true;

                if (order.status === "pending" && targetStatus === "pending") {
                    order.status = "processing";
                }
            }
        }

        // ==========================================
        // ACTUALIZAR ESTADO GENERAL (STOCK Y EVENTOS)
        // ==========================================
        const finalStatus = body.status || order.status;

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
                        );
                    }
                }
            } else if (wasCancelled && !willBeCancelled) {
                for (const item of order.items) {
                    await updateProductStock(
                        item.productId,
                        -item.quantity,
                        item.quantity,
                        session,
                    );
                }
            }

            // Marcamos qué correo hay que enviar al finalizar
            if (finalStatus === "shipped") emailToSend = "shipped";
            if (finalStatus === "ready_for_pickup") emailToSend = "ready";
            if (finalStatus === "completed") emailToSend = "completed";

            order.status = finalStatus;
        }

        await order.save({ session });
        await session.commitTransaction();

        // ==========================================
        // POST-TRANSACCIÓN: ENVÍO DE EMAILS
        // ==========================================
        // Lo ponemos en un try/catch independiente. Si el mail falla (ej. Resend está caído),
        // no le tiramos un error 500 al administrador porque la BD ya se actualizó bien.
        try {
            if (justBecamePaid) {
                await sendPaymentConfirmedEmail(order);
            }

            if (emailToSend === "shipped") {
                await sendOrderShippedEmail(order);
            } else if (emailToSend === "ready") {
                await sendReadyForPickupEmail(order);
            } else if (emailToSend === "completed") {
                await sendOrderCompletedEmail(order);
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
