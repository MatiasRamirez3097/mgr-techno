import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createProduct } from "@/lib/admin-products";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const product = await createProduct(body);

    if (product.id) return Response.json({ id: product.id });
    return Response.json(
        { error: "Error al crear el producto" },
        { status: 500 },
    );
}
