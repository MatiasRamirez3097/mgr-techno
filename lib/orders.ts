// lib/orders.ts
import { WOO_HEADERS } from "./woo";

interface OrderItem {
    product_id: number;
    quantity: number;
}

interface ShippingAddress {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
    phone: string;
}

interface CreateOrderParams {
    customerId: number;
    email: string;
    billing: ShippingAddress;
    shipping: ShippingAddress;
    items: OrderItem[];
    paymentMethod: "mercadopago" | "bacs" | "cod";
    shippingMethod: "local_pickup" | "andreani";
    shippingCost: number;
}

export async function createOrder(params: CreateOrderParams) {
    const body = {
        customer_id: params.customerId,
        payment_method: params.paymentMethod,
        payment_method_title:
            params.paymentMethod === "mercadopago"
                ? "MercadoPago"
                : params.paymentMethod === "bacs"
                  ? "Transferencia bancaria"
                  : "Contra entrega",
        set_paid: false,
        billing: { ...params.billing, email: params.email, country: "AR" },
        shipping: { ...params.shipping, country: "AR" },
        line_items: params.items,
        shipping_lines:
            params.shippingMethod === "local_pickup"
                ? [
                      {
                          method_id: "local_pickup",
                          method_title: "Retiro en local",
                          total: "0",
                      },
                  ]
                : [
                      {
                          method_id: "flat_rate",
                          method_title: "Andreani",
                          total: params.shippingCost.toString(),
                      },
                  ],
    };

    const res = await fetch(`${process.env.WOO_URL}/wp-json/wc/v3/orders`, {
        method: "POST",
        headers: WOO_HEADERS,
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear la orden");
    }

    return res.json();
}
