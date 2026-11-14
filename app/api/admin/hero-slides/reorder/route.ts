import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { reorderHeroSlides } from "@/services/heroSlides/reorderHeroSlides";
import { handleHeroSlideError } from "../handleHeroSlideError";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

export async function PUT(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        await reorderHeroSlides(await req.json());
        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleHeroSlideError(error, "Error reordenando los banners");
    }
}
