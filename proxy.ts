import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
    const token = await getToken({ req });

    const pathname = req.nextUrl.pathname;

    const deadPaths = [
        "/cart-2",
        "/my-account",
        "/wp-admin",
        "/wp-login.php",
        "/wp-content",
        "/xmlrpc.php",
    ];

    if (deadPaths.some((path) => pathname.startsWith(path))) {
        return new NextResponse(
            "Esta página ha sido eliminada permanentemente.",
            {
                status: 410,
                headers: {
                    // Le decimos explícitamente a los bots que no indexen esto
                    "X-Robots-Tag": "noindex, noarchive",
                },
            },
        );
    }

    const isProtected =
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/afip") ||
        pathname.startsWith("/admin");

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
