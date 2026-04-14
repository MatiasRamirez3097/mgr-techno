import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { ResetTokenModel } from "@/models/ResetToken";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return Response.json(
                { error: "Datos incompletos" },
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

        const resetToken = await ResetTokenModel.findOne({
            token,
            used: false,
            expiresAt: { $gt: new Date() },
        });

        if (!resetToken) {
            return Response.json(
                { error: "El link es inválido o expiró" },
                { status: 400 },
            );
        }

        const hashedPassword = await hashPassword(password);
        await CustomerModel.findOneAndUpdate(
            { email: resetToken.email },
            { password: hashedPassword },
        );
        await ResetTokenModel.findByIdAndUpdate(resetToken._id, { used: true });

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> reset-password error:", e);
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}
