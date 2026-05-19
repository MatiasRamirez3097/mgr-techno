// /app/api/admin/invoices/[id]/authorize/route.ts

import { NextResponse } from "next/server";

import { createInvoice } from "@/services/invoices/createInvoice";

export async function POST(
    req: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    },
) {
    try {
        const { id } = await context.params;

        const invoice = await createInvoice({
            invoiceId: id,
        });

        return NextResponse.json(invoice);
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error.message,
            },
            {
                status: 500,
            },
        );
    }
}
