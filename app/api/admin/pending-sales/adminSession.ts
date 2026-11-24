import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isBusinessError } from "@/lib/errors/BusinessError";

/** Devuelve quién hace la acción (nombre o email) o null si no es administrador. */
export async function getAdminActor(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") return null;
    return session.user?.name || session.user?.email || "admin";
}

export const unauthorized = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });

export function handlePendingSaleError(error: unknown, fallback: string) {
    if (isBusinessError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`${fallback}:`, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}
