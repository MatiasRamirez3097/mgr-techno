import { connectDB } from "@/lib/mongodb";
import { generateVoucher } from "@/services/vouchers/generateVoucher";
import { OrderModel } from "@/models";
import { sendFiscalInvoiceEmail } from "@/lib/email";

export async function POST(req: Request, context: any) {
    try {
        await connectDB();

        const { id } = await context.params;
        const body = await req.json();

        // 1. Generamos el comprobante con la API de facturación
        const voucher = await generateVoucher({
            orderId: id,
            type: body.type,
            fiscalType: body.fiscalType,
            relatedVoucherId: body.relatedVoucherId,
        });

        // ==========================================
        // 2. ENVÍO DE EMAIL CON PDF ADJUNTO
        // ==========================================
        // Verificamos que sea una factura de AFIP y que haya sido validada (tenga CAE)
        if (voucher && voucher.cae && body.type === "fiscal_invoice") {
            try {
                // Necesitamos la orden para saber el correo del cliente
                const order = await OrderModel.findById(id).lean();

                if (order) {
                    await sendFiscalInvoiceEmail(order, voucher);
                    console.log(
                        `Email de factura enviado a ${order.customerEmail}`,
                    );
                }
            } catch (emailError) {
                // Silenciamos el error para no arruinar la respuesta del servidor
                // si falla la pasarela de emails.
                console.error(
                    "Error silencioso al intentar enviar la factura por email:",
                    emailError,
                );
            }
        }

        return Response.json({
            success: true,
            voucher,
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,
                error: error.message || "Internal server error",
            },
            {
                status: 500,
            },
        );
    }
}
