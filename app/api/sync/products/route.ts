import { NextRequest } from "next/server";
import { WOO_HEADERS } from "@/lib/woo";
import { syncProduct } from "@/lib/sync";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    let page = 1;
    let synced = 0;

    while (true) {
        const res = await fetch(
            `${process.env.WOO_URL}/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`,
            { headers: WOO_HEADERS },
        );

        const products = await res.json();
        if (!products.length) break;

        for (const product of products) {
            await syncProduct(product);
            synced++;
        }

        const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
        if (page >= totalPages) break;
        page++;
    }

    return Response.json({ ok: true, synced });
}
