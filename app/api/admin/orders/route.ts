import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createAdminOrder } from "@/lib/orders/createAdminOrder";
import { getCustomersById } from "@/lib/customers/getCustomersById";

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();

        const customer = await getCustomersById(body.customerId);
        console.log("customer>>>", customer);
        const dataWithEmail = {
            ...body,
            customerEmail: customer.email,
        };
        const order = await createAdminOrder(dataWithEmail);

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
