import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserModel } from "@/models/User";
// import { sendMagicLinkEmail } from "@/lib/email"; <-- Tu función para enviar correos

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        // 1. Verificamos que el usuario exista
        const user = await UserModel.findOne({ email });

        if (!user) {
            // Por seguridad, siempre devolvemos "ok" aunque no exista,
            // para que no puedan adivinar qué emails están registrados.
            return NextResponse.json({ success: true });
        }

        // 2. Generamos el token que expira en 15 minutos
        const token = jwt.sign(
            { email: user.email },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: "15m" },
        );

        // 3. Armamos la URL mágica
        // Usamos NEXT_PUBLIC_APP_URL (ej: http://localhost:3000)
        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicUrl = `${baseUrl}/auth/verify?token=${token}`;

        // 4. Enviamos el correo
        /* 
        await sendMagicLinkEmail({
            to: email,
            subject: "Iniciá sesión en nuestra tienda",
            url: magicUrl
        });
        */

        console.log("Link mágico generado (Borrar en prod):", magicUrl);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
