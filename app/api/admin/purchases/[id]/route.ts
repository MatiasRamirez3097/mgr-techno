// app/api/purchases/[id]/route.ts

import { updatePurchase } from "@/lib/purchases/updatePurchase";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const purchase = await updatePurchase(id, body);

        return Response.json(
            {
                success: true,
                data: purchase,
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    success: false,
                    error: "Datos inválidos",
                    details: error.issues,
                },
                { status: 400 },
            );
        }

        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error desconocido",
            },
            { status: 500 },
        );
    }
}
