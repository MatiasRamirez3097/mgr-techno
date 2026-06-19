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

        // Guardamos los estados ANTERIORES para comparar y disparar emails
        const wasCancelled = order.status === "cancelled";
        const wasPaid = order.paymentStatus === "paid";
        const oldStatus = order.status;

        let justBecamePaid = false;
        let emailToSend: "shipped" | "ready" | "completed" | null = null;

        // ==========================================
        // 1. EVALUAR NUEVOS ESTADOS OBJETIVO
        // ==========================================
        const targetPaymentStatus = body.paymentStatus || order.paymentStatus;
        const targetStatus = body.status || order.status;

        // ==========================================
        // 2. REGLA DE NEGOCIO: Bloqueo por falta de pago
        // ==========================================
        const advancedStates = [
            "processing",
            "shipped",
            "ready_for_pickup",
            "completed",
        ];

        // Si quieren avanzar la orden, NO está pagada, y NO es un pago en efectivo (cash)
        if (
            advancedStates.includes(targetStatus) &&
            targetPaymentStatus !== "paid" &&
            order.paymentMethod.method !== "cash" // Ajustá esto según cómo guardes el método exacto
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
        // 3. ACTUALIZAR PAGO
        // ==========================================
        if (body.paymentStatus && body.paymentStatus !== order.paymentStatus) {
            order.paymentStatus = body.paymentStatus;

            if (body.paymentStatus === "paid" && !wasPaid) {
                justBecamePaid = true;

                // Automatización: Pendiente -> Procesando
                if (order.status === "pending" && targetStatus === "pending") {
                    order.status = "processing";
                }
            }
        }

        // ==========================================
        // 4. ACTUALIZAR ESTADO GENERAL (STOCK Y EVENTOS)
        // ==========================================
        // Volvemos a leer targetStatus por si la automatización de arriba lo cambió a 'processing'
        const finalStatus = body.status || order.status;

        if (finalStatus !== oldStatus) {
            const willBeCancelled = finalStatus === "cancelled";

            // Control de Inventario (Cancelar vs Revivir)
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

            // Detección de eventos para notificar al cliente después de la transacción
            if (finalStatus === "shipped") emailToSend = "shipped";
            if (finalStatus === "ready_for_pickup") emailToSend = "ready";
            if (finalStatus === "completed") emailToSend = "completed";

            order.status = finalStatus;
        }

        // Guardamos la orden con la sesión atada
        await order.save({ session });
        await session.commitTransaction();

        // ==========================================
        // 5. POST-TRANSACCIÓN (NOTIFICACIONES)
        // ==========================================
        // Los correos no deben bloquear la transacción de la DB

        if (justBecamePaid) {
            sendPaymentConfirmedEmail(order).catch((err) =>
                console.error("Email de pago falló:", err),
            );
        }

        if (emailToSend === "shipped") {
            // ej: sendOrderShippedEmail(order, body.trackingNumber).catch(console.error);
            console.log("Acá mandarías el mail de ENVIADO");
        } else if (emailToSend === "ready") {
            // ej: sendReadyForPickupEmail(order).catch(console.error);
            console.log("Acá mandarías el mail de LISTO PARA RETIRAR");
        } else if (emailToSend === "completed") {
            // ej: sendOrderCompletedEmail(order).catch(console.error);
            console.log("Acá mandarías el mail de GRACIAS POR TU COMPRA");
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
