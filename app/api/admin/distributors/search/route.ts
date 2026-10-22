import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const category = searchParams.get("category") || "";

        if (!q.trim() && !category.trim()) {
            return NextResponse.json({ products: [] });
        }

        // Consultamos únicamente los distribuidores permitidos: Elit y NewBytes (excluyendo INVID)
        const products = await getDistributorProducts(q, category, ["elit", "newbytes"]);

        return NextResponse.json({ products });
    } catch (err: unknown) {
        console.error("Error searching distributor products:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error buscando en distribuidores" },
            { status: 500 },
        );
    }
}
