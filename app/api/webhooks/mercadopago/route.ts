import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/verifyWebhookSignature";
import { recalculateOrderPaymentStatus } from "@/services/orders/recalculateOrderPaymentStatus";

// INICIALIZAMOS EL CLIENTE DE MP
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN as string,
});

// Tolerancia por redondeos entre el total del pedido y lo cobrado por MP
const AMOUNT_TOLERANCE = 1;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Identificar si es una notificación de pago (vía Webhook o IPN)
        const paymentId = body?.data?.id || body?.id;
        const topic = body?.type || body?.topic;

        // 2. VALIDAR FIRMA (x-signature)
        const signature = verifyMercadoPagoSignature({
            xSignature: req.headers.get("x-signature"),
            xRequestId: req.headers.get("x-request-id"),
            dataId:
                req.nextUrl.searchParams.get("data.id") ||
                (paymentId ? String(paymentId) : null),
        });

        if (signature === "invalid") {
            console.warn("⚠️ Webhook de Mercado Pago con firma inválida");
            return NextResponse.json(
                { error: "Firma inválida" },
                { status: 401 },
            );
        }

        if (signature === "not_configured") {
            console.warn(
                "⚠️ MP_WEBHOOK_SECRET no configurado: webhook procesado sin validar firma",
            );
        }

        if (topic === "payment" && paymentId) {
            // 3. CONSULTAR A MERCADOPAGO
            // Nunca confiamos en el body que llega, usamos el ID para preguntarle
            // directamente a los servidores de MP el estado real del pago.
            const paymentClient = new Payment(client);
            const paymentInfo = await paymentClient.get({ id: paymentId });

            const status = paymentInfo.status;
            const externalReference = paymentInfo.external_reference; // ¡Este es nuestro order._id!

            if (status === "approved" && externalReference) {
                await connectDB();

                const order = await OrderModel.findById(externalReference);

                // Verificamos que la orden exista y no haya sido pagada antes
                if (order && order.paymentStatus !== "paid") {
                    const paidByMp = Number(paymentInfo.transaction_amount) || 0;

                    if (paidByMp + AMOUNT_TOLERANCE < order.total) {
                        console.error(
                            `❌ Monto pagado en MP ($${paidByMp}) menor al total de la orden ${externalReference} ($${order.total}). No se marca como pagada.`,
                        );
                        return NextResponse.json(
                            { received: true },
                            { status: 200 },
                        );
                    }

                    // 4. ACTUALIZAMOS EL PAGO DE MP Y RECALCULAMOS LA ORDEN
                    const mpPayment = order.payments?.find(
                        (p: any) => p.method === "mercadopago",
                    );

                    if (mpPayment) {
                        mpPayment.status = "paid";
                        mpPayment.amount = order.total;
                        mpPayment.paidAt = new Date();
                        mpPayment.reference = paymentId.toString(); // ID de transacción de MP
                    } else {
                        order.payments.push({
                            method: "mercadopago",
                            status: "paid",
                            amount: order.total,
                            paidAt: new Date(),
                            reference: paymentId.toString(),
                        });
                    }

                    recalculateOrderPaymentStatus(order);

                    // Mismo criterio que el panel: un pedido pagado pasa a "en proceso"
                    if (
                        order.paymentStatus === "paid" &&
                        order.status === "pending"
                    ) {
                        order.status = "processing";
                    }

                    await order.save();

                    try {
                        await sendPaymentConfirmedEmail(mapOrderToDTO(order));
                    } catch (emailErr) {
                        // No rompemos el proceso del webhook si falla el mail
                        console.error(
                            "No se pudo enviar el email de pago:",
                            emailErr,
                        );
                    }
                    console.log(
                        `✅ Orden ${externalReference} marcada como PAGADA con éxito.`,
                    );
                }
            } else if (status === "rejected" && externalReference) {
                console.log(
                    `❌ Pago rechazado para la orden ${externalReference}`,
                );
            }
        }

        // 5. RESPUESTA OBLIGATORIA
        // Mercado Pago exige que respondamos con un HTTP 200 lo más rápido posible.
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("❌ Error en el Webhook de Mercado Pago:", error);

        // Devolvemos 200 igual, para que MP no asuma que su servidor se cayó y haga reintentos infinitos.
        return NextResponse.json({ received: true }, { status: 200 });
    }
}
