import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session)
        return Response.json({ error: "No autorizado" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
        return Response.json(
            { error: "La nueva contraseña debe tener al menos 8 caracteres" },
            { status: 400 },
        );
    }

    await connectDB();

    const customerId = session.customerId;
    const email = session.user?.email;

    const user = await UserModel.findOne({
        $or: [
            ...(customerId ? [{ customerId }] : []),
            ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ],
    });

    if (!user)
        return Response.json(
            { error: "Usuario no encontrado" },
            { status: 404 },
        );

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid)
        return Response.json(
            { error: "La contraseña actual es incorrecta" },
            { status: 400 },
        );

    const hashedPassword = await hashPassword(newPassword);
    await UserModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
    });

    return Response.json({ ok: true });
}
