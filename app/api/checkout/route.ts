import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await req.json();

        const subtotal = body.items.reduce(
            (acc: number, item: any) =>
                acc + parseFloat(item.price) * item.quantity,
            0,
        );
        const total = subtotal + (body.shippingCost || 0);

        const order = await OrderModel.create({
            customerId: (session as any).customerId,
            customerEmail: session.user?.email,
            status: "pending",
            billing: {
                firstName: body.billing.first_name,
                lastName: body.billing.last_name,
                address1: body.billing.address_1,
                city: body.billing.city,
                state: body.billing.state,
                postcode: body.billing.postcode,
                phone: body.billing.phone,
                country: "AR",
                tipoDocumento: body.meta_data?.find(
                    (m: any) => m.key === "_billing_tipo_documento",
                )?.value,
                numeroDocumento: body.meta_data?.find(
                    (m: any) => m.key === "_billing_numero_documento",
                )?.value,
            },
            shipping: {
                firstName: body.shipping.first_name,
                lastName: body.shipping.last_name,
                address1: body.shipping.address_1,
                city: body.shipping.city,
                state: body.shipping.state,
                postcode: body.shipping.postcode,
                country: "AR",
            },
            lineItems: body.items.map((item: any) => ({
                productId: item.product_id.toString(),
                wooId: item.product_id,
                name: item.name || "",
                quantity: item.quantity,
                price: parseFloat(item.price || "0"),
                total: parseFloat(item.price || "0") * item.quantity,
                image: item.image || "",
                slug: item.slug || "",
            })),
            paymentMethod: body.paymentMethod,
            paymentMethodTitle:
                body.paymentMethod === "mercadopago"
                    ? "MercadoPago"
                    : body.paymentMethod === "bacs"
                      ? "Transferencia bancaria"
                      : "Contra entrega",
            shippingMethod: body.shippingMethod,
            shippingCost: body.shippingCost || 0,
            subtotal,
            total,
        });

        return Response.json({ orderId: order._id.toString() });
    } catch (e: any) {
        console.log(">>> checkout error:", e);
        return Response.json({ error: e.message }, { status: 500 });
    }
}
