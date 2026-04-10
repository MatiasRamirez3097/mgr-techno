// app/api/checkout/route.ts
import { getServerSession } from "next-auth";
import { createOrder } from "@/lib/orders";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const session = await getServerSession();

    if (!session) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const order = await createOrder({
            customerId: (session as any).customerId,
            email: session.user?.email || "",
            billing: body.billing,
            shipping: body.shipping,
            items: body.items,
            paymentMethod: body.paymentMethod,
            shippingMethod: body.shippingMethod,
            shippingCost: body.shippingCost || 0,
        });

        return Response.json({ orderId: order.id, orderKey: order.order_key });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
