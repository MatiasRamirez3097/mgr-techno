import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createAdminOrder } from "@/lib/orders/createAdminOrder";

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();

        const order = await createAdminOrder(body);

        return NextResponse.json({
            success: true,
            data: order,
        });
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                error: error.message || "Error al crear orden",
            },
            {
                status: 400,
            },
        );
    }
}
