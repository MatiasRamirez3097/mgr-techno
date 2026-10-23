import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { saveComparatorCategory } from "@/services/distributors/categories/saveComparatorCategory";
import { deleteComparatorCategory } from "@/services/distributors/categories/deleteComparatorCategory";
import { handleCategoryError } from "../handleCategoryError";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        const category = await saveComparatorCategory(await req.json(), id);
        return NextResponse.json({ category });
    } catch (error) {
        return handleCategoryError(error, "Error actualizando la categoría");
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        await deleteComparatorCategory(id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleCategoryError(error, "Error eliminando la categoría");
    }
}
