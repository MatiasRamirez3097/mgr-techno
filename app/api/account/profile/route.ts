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

    const firstName = body.firstName ?? body.first_name;
    const lastName = body.lastName ?? body.last_name;
    const phone = body.phone;
    const tipoDocumento = body.tipoDocumento ?? body.tipo_documento ?? body.document?.documentType;
    const numeroDocumento = body.numeroDocumento ?? body.numero_documento ?? body.document?.number;

    await CustomerModel.findByIdAndUpdate((session as any).customerId, {
        firstName,
        lastName,
        phone,
        tipoDocumento,
        numeroDocumento,
        billing: {
            firstName,
            lastName,
            address: body.address,
            city: body.city,
            state: body.state,
            postcode: body.postcode,
            phone,
            country: "AR",
        },
    });

    return Response.json({ ok: true });
}
