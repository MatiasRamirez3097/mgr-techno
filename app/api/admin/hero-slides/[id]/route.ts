import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { saveHeroSlide } from "@/services/heroSlides/saveHeroSlide";
import { deleteHeroSlide } from "@/services/heroSlides/deleteHeroSlide";
import { handleHeroSlideError } from "../handleHeroSlideError";

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
        const slide = await saveHeroSlide(await req.json(), id);
        return NextResponse.json({ slide });
    } catch (error) {
        return handleHeroSlideError(error, "Error actualizando el banner");
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
        await deleteHeroSlide(id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleHeroSlideError(error, "Error eliminando el banner");
    }
}
