export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models/Order";

import { saleReceiptTemplate } from "@/lib/pdf/templates/saleReceiptTemplate";

import { generatePdf } from "@/lib/pdf/generators/generatePdf";

import { mapOrderToSaleReceipt } from "@/lib/mappers/saleReceiptMapper";

import { uploadBuffer } from "@/lib/cloudinary";

export async function POST(
    req: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { id } = await context.params;

        const order = await OrderModel.findById(id).lean();
        if (!order) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Order not found",
                },
                {
                    status: 404,
                },
            );
        }

        /*
         * MAP DATA
         */

        const data = mapOrderToSaleReceipt(order);
        /*
         * BUILD HTML
         */

        const html = saleReceiptTemplate(data);
        /*
         * GENERATE PDF
         */
        console.log("html>>>", html);
        const pdf = await generatePdf(html);
        console.log("pdf>>>", pdf);
        /*
         * UPLOAD TO CLOUDINARY
         */

        const uploaded = await uploadBuffer({
            buffer: pdf,
            folder: "receipts",
            fileName: `receipt-${id}`,
        });

        /*
         * SAVE IN ORDER
         */

        await OrderModel.findByIdAndUpdate(id, {
            receipt: {
                url: uploaded.secure_url,
                publicId: uploaded.public_id,
                generatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,

            receipt: {
                url: uploaded.secure_url,
            },
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to generate receipt",
            },
            {
                status: 500,
            },
        );
    }
}
