import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getHeroSlides } from "@/services/heroSlides/getHeroSlides";
import { saveHeroSlide } from "@/services/heroSlides/saveHeroSlide";
import { handleHeroSlideError } from "./handleHeroSlideError";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json({ slides: await getHeroSlides() });
    } catch (error) {
        return handleHeroSlideError(error, "Error obteniendo los banners");
    }
}

export async function POST(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const slide = await saveHeroSlide(await req.json());
        return NextResponse.json({ slide }, { status: 201 });
    } catch (error) {
        return handleHeroSlideError(error, "Error creando el banner");
    }
}
