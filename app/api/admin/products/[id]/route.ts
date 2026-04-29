import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";

import { updateProductById } from "@/lib/products/updateProduct";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await req.json();
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
    const { id } = await params;
    await connectDB();

    await ProductModel.findByIdAndDelete(id);
    return Response.json({ ok: true });
}
