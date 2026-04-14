import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session)
        return Response.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    await CustomerModel.findByIdAndUpdate((session as any).customerId, {
        firstName: body.first_name,
        lastName: body.last_name,
        phone: body.phone,
        tipoDocumento: body.tipo_documento,
        numeroDocumento: body.numero_documento,
        billing: {
            firstName: body.first_name,
            lastName: body.last_name,
            address1: body.address_1,
            city: body.city,
            state: body.state,
            postcode: body.postcode,
            phone: body.phone,
            country: "AR",
        },
    });

    return Response.json({ ok: true });
}
