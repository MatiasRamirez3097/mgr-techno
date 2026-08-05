import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validators/createOrderSchema";
import { createOrder } from "@/lib/orders/createOrder";
import bcrypt from "bcryptjs";
// Importá tus modelos
import { CustomerModel, UserModel } from "@/models";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        const body = await req.json();

        const emailToUse = session?.user?.email || body.customerEmail;

        if (!emailToUse) {
            return NextResponse.json(
                {
                    success: false,
                    error: "El correo electrónico es obligatorio.",
                },
                { status: 400 },
            );
        }

        let finalCustomerId = session?.customerId || null;

        // LÓGICA PARA INVITADOS O USUARIOS SIN SESIÓN
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
        const order = await createOrder(result.data);

        return NextResponse.json(order);
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.log(error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
