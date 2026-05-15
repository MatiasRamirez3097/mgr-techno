import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { CustomerModel } from "@/models/Customer";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await mongoose.startSession();

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
                {
                    error: "La contraseña debe tener al menos 8 caracteres",
                },
                { status: 400 },
            );
        }

        await connectDB();

        const existing = await UserModel.findOne({ email });

        if (existing) {
            return Response.json(
                {
                    error: "Ya existe una cuenta con ese email",
                },
                { status: 409 },
            );
        }

        const hashedPassword = await hashPassword(password);

        let resultUser;

        await session.withTransaction(async () => {
            // 1. Crear customer
            const customer = await CustomerModel.create(
                [
                    {
                        firstName,
                        lastName,
                        email,
                    },
                ],
                { session },
            );

            // 2. Crear user
            const user = await UserModel.create(
                [
                    {
                        email,
                        password: hashedPassword,
                        customerId: customer[0]._id,
                        role: "customer",
                    },
                ],
                { session },
            );

            resultUser = user[0];
        });

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> register error:", e);

        return Response.json(
            { error: "Error al crear la cuenta" },
            { status: 500 },
        );
    } finally {
        session.endSession();
    }
}
