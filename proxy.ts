import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    // 1. RUTAS MUERTAS (SEO y bots de WordPress)
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
                    "X-Robots-Tag": "noindex, noarchive",
                },
            },
        );
    }

    // Identificamos si es una ruta protegida (Admin / AFIP)
    const isProtected =
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/afip") ||
        pathname.startsWith("/admin");

    // 2. MODO MANTENIMIENTO
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";

    // Evitamos bloquear archivos estáticos (imágenes, CSS) o la propia página de mantenimiento
    const isStaticOrMaintenance =
        pathname.startsWith("/_next") ||
        pathname === "/mantenimiento" ||
        pathname.includes(".");

    // Si está en mantenimiento, NO es un archivo estático y NO es el panel de admin -> Redirigimos
    if (isMaintenanceMode && !isStaticOrMaintenance && !isProtected) {
        const url = req.nextUrl.clone();
        url.pathname = "/mantenimiento";
        return NextResponse.rewrite(url);
    }

    // 3. PROTECCIÓN CON NEXT-AUTH (Para el panel de Admin)
    if (isProtected) {
        const token = await getToken({ req });

        // ❌ no logueado
        if (!token) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 },
            );
        }

        // ❌ no es admin
        if (token.role !== "administrator") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    return NextResponse.next();
}

// 4. CONFIGURACIÓN DEL MIDDLEWARE
export const config = {
    matcher: [
        /*
         * Aplica el middleware a todas las rutas EXCEPTO:
         * - api/webhooks (para que Mercado Pago te avise de los pagos)
         */
        "/((?!api/webhooks).*)",
    ],
};
