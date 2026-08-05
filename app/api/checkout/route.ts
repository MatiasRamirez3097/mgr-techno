import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validators/createOrderSchema";
import { createOrder } from "@/lib/orders/createOrder";
import { UserModel } from "@/models";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        const body = await req.json();

        // 1. DETERMINAR EL EMAIL
        // Por seguridad, si hay sesión activa, mandamos el email de la sesión.
        // Si no hay sesión, tomamos el email que completó el invitado en el formulario.
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

        // 2. BUSCAR O CREAR USUARIO (Lógica de vinculación)
        let finalCustomerId = session?.customerId || null;

        // Si el usuario no tiene sesión activa, interactuamos con la base de datos
        if (!session) {
            let existingUser = await UserModel.findOne({ email: emailToUse });

            if (existingUser) {
                // El usuario existe, vinculamos la orden a su cuenta
                finalCustomerId = existingUser._id;
            } else {
                // 1. Generamos una contraseña aleatoria segura
                const randomPassword =
                    Math.random().toString(36).slice(-10) + "A1!";
                // 2. La hasheamos
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                // 2. La hasheamos
                // B. El usuario no existe, creamos una cuenta "fantasma" o de invitado
                const newUser = await UserModel.create({
                    email: emailToUse,
                    firstName: body.billing?.firstName || "",
                    lastName: body.billing?.lastName || "",
                    password: hashedPassword,
                    role: "customer",
                });

                finalCustomerId = newUser._id;

                // 💡 ACÁ PODRÍAS DISPARAR EL ENVÍO DEL EMAIL:
                // sendWelcomeEmail({ email: emailToUse, isMagicLink: true, ... })
            }
            // Nota: Mientras implementás la DB, podés dejar finalCustomerId como undefined
            // si tu base de datos de órdenes permite órdenes sin customerId ligado.
        }

        // 3. PREPARAR PAYLOAD FINAL
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
