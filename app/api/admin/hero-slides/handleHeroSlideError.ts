import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isBusinessError } from "@/lib/errors/BusinessError";

// Respuesta de error común para el ABM de banners del hero
export function handleHeroSlideError(error: unknown, fallback: string) {
    if (error instanceof ZodError) {
        return NextResponse.json(
            { error: error.issues[0]?.message || "Datos inválidos" },
            { status: 400 },
        );
    }
    if (isBusinessError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`${fallback}:`, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}
