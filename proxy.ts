import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
    const token = await getToken({ req });

    const pathname = req.nextUrl.pathname;

    const isProtected =
        pathname.startsWith("/api/admin") || pathname.startsWith("/api/afip");

    if (!isProtected) return NextResponse.next();

    // ❌ no logueado
    if (!token) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ❌ no es admin
    if (token.role !== "administrator") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
}
