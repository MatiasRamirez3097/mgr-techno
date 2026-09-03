import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models";

// INICIALIZAMOS EL CLIENTE DE MP
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN as string,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Identificar si es una notificación de pago (vía Webhook o IPN)
        const paymentId = body?.data?.id || body?.id;
        const topic = body?.type || body?.topic;

        if (topic === "payment" && paymentId) {
            // 2. CONSULTAR A MERCADOPAGO (Seguridad)
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
                    // 3. ACTUALIZAMOS LOS CAMPOS DE LA ORDEN
                    order.paymentStatus = "paid";
                    order.paidAmount = order.total;
                    order.remainingAmount = 0;

                    // Opcional: Podés cambiar el estado general del pedido
                    // order.status = "processing";

                    // 4. Actualizamos el registro específico de pago en el array `payments`
                    if (order.payments && order.payments.length > 0) {
                        const mpPayment = order.payments.find(
                            (p: any) => p.method === "mercadopago",
                        );
                        if (mpPayment) {
                            mpPayment.status = "paid";
                            mpPayment.reference = paymentId.toString(); // Guardamos el ID de transacción de MP
                        }
                    }

                    await order.save();
                    console.log(
                        `✅ Orden ${externalReference} marcada como PAGADA con éxito.`,
                    );
                }
            } else if (status === "rejected" && externalReference) {
                // Manejo opcional si el pago fue rechazado
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
