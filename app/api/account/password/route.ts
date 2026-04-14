import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session)
        return Response.json({ error: "No autorizado" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    await connectDB();

    const customer = await CustomerModel.findById((session as any).customerId);
    if (!customer)
        return Response.json(
            { error: "Cliente no encontrado" },
            { status: 404 },
        );

    const valid = await verifyPassword(currentPassword, customer.password);
    if (!valid)
        return Response.json(
            { error: "La contraseña actual es incorrecta" },
            { status: 400 },
        );

    const hashedPassword = await hashPassword(newPassword);
    await CustomerModel.findByIdAndUpdate(customer._id, {
        password: hashedPassword,
    });

    return Response.json({ ok: true });
}
