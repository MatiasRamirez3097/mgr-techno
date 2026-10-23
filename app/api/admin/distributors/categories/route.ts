import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getComparatorCategories } from "@/services/distributors/categories/getComparatorCategories";
import { saveComparatorCategory } from "@/services/distributors/categories/saveComparatorCategory";
import { handleCategoryError } from "./handleCategoryError";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json({ categories: await getComparatorCategories() });
    } catch (error) {
        return handleCategoryError(error, "Error obteniendo las categorías");
    }
}

export async function POST(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const category = await saveComparatorCategory(await req.json());
        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        return handleCategoryError(error, "Error creando la categoría");
    }
}
