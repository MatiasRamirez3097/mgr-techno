// app/api/purchases/[id]/receive/route.ts

import { receivePurchase } from "@/lib/purchases/receivePurchase";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    try {
        const body = await req.json(); // seriales, etc
        console.log("body>>>", body);
        const result = await receivePurchase(id, body);

        return Response.json({ success: true, data: result }, { status: 200 });
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
