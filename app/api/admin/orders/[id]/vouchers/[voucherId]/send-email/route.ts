import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { sendFiscalInvoiceEmail } from "@/lib/email";
import { mapOrderToDTO } from "@/lib/mappers/orderMapper";

export async function POST(req: Request, context: any) {
    try {
        await connectDB();

        // Extraemos el ID de la orden y el ID del voucher desde la URL
        const { id: orderId, voucherId } = await context.params;

        const order = await OrderModel.findById(orderId).lean();

        if (!order) {
            return Response.json(
                { error: "Orden no encontrada" },
                { status: 404 },
            );
        }

        // Buscamos el comprobante específico dentro de la orden
        // (Soportamos tanto _id de Mongo como string id mapeado)
        const voucher = order.vouchers?.find(
            (v: any) => v._id?.toString() === voucherId || v.id === voucherId,
        );

        if (!voucher) {
            return Response.json(
                { error: "Comprobante no encontrado" },
                { status: 404 },
            );
        }

        // Reutilizamos tu función de envío de correos
        // Nota: Si usas una función distinta para comprobantes no fiscales,
        // puedes agregar un if(voucher.type === 'non_fiscal_receipt') aquí.
        await sendFiscalInvoiceEmail(mapOrderToDTO(order), voucher);

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Error al forzar envío de email de comprobante:", error);
        return Response.json(
            { error: "Error interno enviando el email" },
            { status: 500 },
        );
    }
}
