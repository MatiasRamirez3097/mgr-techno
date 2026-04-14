import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { ResetTokenModel } from "@/models/ResetToken";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email)
            return Response.json({ error: "Email requerido" }, { status: 400 });

        await connectDB();
        const customer = await CustomerModel.findOne({ email });

        // Siempre devolvemos ok para no revelar si el email existe
        if (!customer) return Response.json({ ok: true });

        await ResetTokenModel.deleteMany({ email });

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await ResetTokenModel.create({ email, token, expiresAt });

        const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);

        return Response.json({ ok: true });
    } catch (e) {
        console.log(">>> forgot-password error:", e);
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}
