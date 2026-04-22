import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import type { ProductInput } from "@/types/backend/productInput";

import { updateProductById } from "@/lib/products/updateProduct";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await req.json();
    console.log(body);
    try {
        const product = await updateProductById(id, body);
        return Response.json({ success: true, product });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    await ProductModel.findByIdAndDelete(id);
    return Response.json({ ok: true });
}
