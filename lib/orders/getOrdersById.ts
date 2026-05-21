import { connectDB } from "@/lib/mongodb";

import { OrderDTO } from "@/types/shared/order";

import { OrderModel } from "@/models/Order";

import { InvoiceModel } from "@/models/Invoice";

import { mapOrderToDTO } from "../mappers/orderMapper";

export async function getOrdersById(id: string): Promise<OrderDTO | null> {
    await connectDB();

    const order = await OrderModel.findById(id).lean();

    if (!order) {
        return null;
    }

    const invoices = await InvoiceModel.find({
        orderId: order._id,
    })
        .sort({
            createdAt: -1,
        })
        .lean();

    return {
        ...mapOrderToDTO(order),

        invoices: invoices.map((invoice) => ({
            id: invoice._id.toString(),

            type: invoice.type,

            pointOfSale: invoice.pointOfSale,

            voucherNumber: invoice.voucherNumber,

            cae: invoice.cae,

            caeExpiration: invoice.caeExpiration,

            afipStatus: invoice.afipStatus,

            pdfUrl: invoice.pdfUrl,

            createdAt: invoice.createdAt,
        })),
    };
}
