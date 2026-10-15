import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const updateData: any = {
        name: body.name?.trim(),
        slug: body.slug?.trim(),
        image: body.image || null,
        parentId:
            body.parentId && Types.ObjectId.isValid(body.parentId)
                ? new Types.ObjectId(body.parentId)
                : null,
    };

    const category = await CategoryModel.findByIdAndUpdate(id, updateData, {
        returnDocument: "after",
    });

    if (!category) {
        return Response.json(
            { error: "Categoría no encontrada" },
            { status: 404 },
        );
    }
    return Response.json({ ok: true, category });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const category = await CategoryModel.findById(id);
    if (!category) {
        return Response.json(
            { error: "Categoría no encontrada" },
            { status: 404 },
        );
    }

    // Comprobar si hay productos asociados a esta categoría
    const hasProducts = await ProductModel.exists({ categories: id });
    if (hasProducts) {
        return Response.json(
            {
                error: `No se puede eliminar la categoría "${category.name}" porque posee productos asignados. Reasigna los productos a otra categoría antes de eliminarla.`,
            },
            { status: 409 },
        );
    }

    // Comprobar si hay subcategorías hijas
    const hasChildren = await CategoryModel.exists({ parentId: id });
    if (hasChildren) {
        return Response.json(
            {
                error: `No se puede eliminar la categoría "${category.name}" porque posee subcategorías asignadas como hijas. Modifica o elimina las subcategorías primero.`,
            },
            { status: 409 },
        );
    }

    await CategoryModel.findByIdAndDelete(id);

    return Response.json({ ok: true, message: "Categoría eliminada" });
}
