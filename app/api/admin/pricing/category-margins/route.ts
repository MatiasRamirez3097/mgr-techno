import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateCategoryMargins } from "@/services/pricing/updateCategoryMargins";

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const modified = await updateCategoryMargins(await req.json());
        return NextResponse.json({ success: true, modified });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error guardando márgenes" },
            { status: 400 },
        );
    }
}
