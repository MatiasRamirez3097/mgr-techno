import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { applyProductPrices } from "@/services/pricing/applyProductPrices";

// Hasta 500 productos por vez, uno por uno (cada uno recalcula sus combos)
export const maxDuration = 120;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const result = await applyProductPrices(await req.json());
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error aplicando precios" },
            { status: 400 },
        );
    }
}
