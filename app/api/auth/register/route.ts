import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { firstName, lastName, email, password } = await req.json();

        if (!firstName || !lastName || !email || !password) {
            return Response.json(
                { error: "Todos los campos son requeridos" },
                { status: 400 },
            );
        }

        if (password.length < 8) {
            return Response.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 },
            );
        }

        await connectDB();

        // Verificar si ya existe
        const existing = await CustomerModel.findOne({ email });
        if (existing) {
            return Response.json(
                { error: "Ya existe una cuenta con ese email" },
                { status: 409 },
            );
        }

        const hashedPassword = await hashPassword(password);

        await CustomerModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: "customer",
        });

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> register error:", e);
        return Response.json(
            { error: "Error al crear la cuenta" },
            { status: 500 },
        );
    }
}
