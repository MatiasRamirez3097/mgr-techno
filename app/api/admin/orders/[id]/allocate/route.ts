// app/api/admin/orders/[id]/allocate/route.ts

import { NextRequest, NextResponse } from "next/server";

import { allocateInventoryToOrder } from "@/lib/inventory/allocateInventoryToOrder";

export async function POST(
    req: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string }>;
    },
) {
    try {
        const body = await req.json();

        const { id } = await params;

        await allocateInventoryToOrder(id, body.items);

        return NextResponse.json({
            success: true,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Error asignando inventario",
            },
            {
                status: 400,
            },
        );
    }
}
