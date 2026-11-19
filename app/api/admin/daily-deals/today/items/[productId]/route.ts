import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { BusinessError } from "@/lib/errors/BusinessError";
import { removeDealItem } from "@/services/dailyDeals/removeDealItem";

/** Saca un producto de la oferta de hoy y le restaura el precio */
export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { productId } = await params;
        return NextResponse.json({ success: true, ...(await removeDealItem(productId)) });
    } catch (error) {
        if (error instanceof BusinessError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error quitando un producto de la oferta del día:", error);
        return NextResponse.json({ error: "Error quitando el producto" }, { status: 500 });
    }
}
