import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validators/createOrderSchema";
import { createOrder } from "@/services/orders/createOrder";
import { quoteShipping } from "@/services/shipping/quoteShipping";
import bcrypt from "bcryptjs";
// Importá tus modelos
import { CustomerModel, UserModel } from "@/models";
import { connectDB } from "@/lib/mongodb";
import { isBusinessError } from "@/lib/errors/BusinessError";

// IMPORTAMOS MERCADOPAGO
import { MercadoPagoConfig, Preference } from "mercadopago";

// INICIALIZAMOS EL CLIENTE
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN as string,
});

const QUOTABLE_SHIPPING_METHODS = ["andreani", "viacargo"];

type CheckoutShippingInput = {
    shipping?: { postcode?: string };
    billing?: { postcode?: string };
    items?: { productId?: unknown; quantity?: unknown }[];
};

async function getServerShippingCost(
    body: CheckoutShippingInput,
    shippingMethod: string,
): Promise<number | null> {
    const postcode = body?.shipping?.postcode || body?.billing?.postcode;
    if (!postcode || !Array.isArray(body?.items)) return null;

    try {
        // Andreani devuelve { total, error? }; Vía Cargo { total } o "error"
        const quote = (await quoteShipping({
            postcode,
            shippingMethod,
            items: body.items.map((i) => ({
                id: String(i.productId),
                quantity: Number(i.quantity) || 1,
            })),
        })) as { total?: number; error?: string } | string | undefined;

        if (!quote || typeof quote === "string" || quote.error) {
            return null;
        }

        const total = Number(quote.total);
        if (!Number.isFinite(total) || total <= 0) {
            return null;
        }
        return total;
    } catch (error) {
        console.error("Error recotizando envío en checkout:", error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        const body = await req.json();

        const rawEmail = session?.user?.email || body.customerEmail;
        const emailToUse = rawEmail ? rawEmail.toLowerCase().trim() : null;

        if (!emailToUse) {
            return NextResponse.json(
                {
                    success: false,
                    error: "El correo electrónico es obligatorio.",
                },
                { status: 400 },
            );
        }

        // RECOTIZACIÓN DEL ENVÍO EN EL SERVIDOR
        // El costo de Andreani/Vía Cargo nunca se toma del front. Se guarda el
        // costo base; createOrder aplica la regla de envío gratis.
        const shippingMethodId = body?.shippingMethod?.method;
        if (QUOTABLE_SHIPPING_METHODS.includes(shippingMethodId)) {
            const quotedCost = await getServerShippingCost(
                body,
                shippingMethodId,
            );

            if (quotedCost === null) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "No pudimos cotizar el envío en este momento. Por favor, reintentá en unos minutos.",
                    },
                    { status: 503 },
                );
            }

            body.shippingMethod.cost = quotedCost;
        }

        let finalCustomerId = session?.customerId || null;

        // LÓGICA PARA INVITADOS O USUARIOS SIN SESIÓN
        // Decisión de negocio: si el email ya tiene cuenta, el pedido se asocia a
        // ese cliente sin pedir login (no se modifican sus datos ni se exponen).
        if (!session) {
            // 1. Buscar o Crear el CUSTOMER (Perfil de facturación)
            let customer = await CustomerModel.findOne({ email: emailToUse });

            if (!customer) {
                // Creamos el Customer mapeando los datos del checkout (billing)
                customer = await CustomerModel.create({
                    email: emailToUse,
                    firstName: body.billing.firstName,
                    lastName: body.billing.lastName,
                    phone: body.billing.phone,
                    billing: body.billing,
                    document: body.billing.document,
                });
            }

            // Guardamos el ID del Customer para mandárselo a Zod y a la Orden
            finalCustomerId = customer._id.toString();

            // 2. Buscar o Crear el USER (Cuenta de autenticación)
            let user = await UserModel.findOne({ email: emailToUse });

            if (!user) {
                // Generamos una contraseña segura al azar
                const randomPassword =
                    Math.random().toString(36).slice(-10) + "A1$!";
                const hashedPassword = await bcrypt.hash(randomPassword, 10);

                // Creamos la cuenta de usuario vinculándola al Customer creado arriba
                await UserModel.create({
                    email: emailToUse,
                    password: hashedPassword,
                    customerId: customer._id, // ¡Acá resolvemos el error que tenías!
                    role: "customer",
                });

                // OPCIONAL: Acá podrías disparar un email avisándole al usuario
                // que le creaste una cuenta y mandarle su `randomPassword`.
            }
        }

        // PREPARAR PAYLOAD FINAL PARA ZOD
        const dataWithEmail = {
            ...body,
            customerEmail: emailToUse,
            customerId: finalCustomerId,
        };

        // 🔥 VALIDACIÓN
        const result = createOrderSchema.safeParse(dataWithEmail);

        if (!result.success) {
            console.log(">error", result.error);
            return NextResponse.json(
                {
                    success: false,
                    error: "Datos inválidos",
                    details: result.error,
                },
                { status: 400 },
            );
        }

        // 🔥 SERVICE
        const orderResult = await createOrder(result.data);

        // ==========================================
        // 🔥 LÓGICA DE MERCADOPAGO
        // ==========================================
        const hasMercadoPago = result.data.payments.some(
            (p: any) => p.method === "mercadopago",
        );

        if (hasMercadoPago) {
            const preference = new Preference(client);
            const appUrl =
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

            const preferenceData = await preference.create({
                body: {
                    items: [
                        {
                            id: orderResult.order,
                            title: `Pedido en MGR Techno #${orderResult.order.slice(-6).toUpperCase()}`,
                            quantity: 1,
                            unit_price: orderResult.total, // El total exacto calculado en el backend
                            currency_id: "ARS",
                        },
                    ],
                    payer: {
                        email: emailToUse,
                        name: result.data.billing.firstName,
                        surname: result.data.billing.lastName,
                    },
                    back_urls: {
                        // A dónde vuelve si sale todo bien
                        success: `${appUrl}/checkout/success?order=${orderResult.order}`,
                        // A dónde vuelve si falla (lo mandamos de vuelta al checkout)
                        failure: `${appUrl}/checkout?error=pago_fallido`,
                        // A dónde vuelve si queda pendiente (ej: Pago Fácil)
                        pending: `${appUrl}/checkout/success?order=${orderResult.order}&status=pending`,
                    },
                    auto_return: "approved",
                    external_reference: orderResult.order, // Clave para los Webhooks
                    notification_url: `${appUrl}/api/webhooks/mercadopago`,
                },
            });

            // Devolvemos el init_point al Frontend para que haga la redirección
            return NextResponse.json({
                success: true,
                order: orderResult.order,
                init_point: preferenceData.init_point,
            });
        }

        return NextResponse.json(orderResult);
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        if (isBusinessError(error)) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.status },
            );
        }
        console.log(error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
