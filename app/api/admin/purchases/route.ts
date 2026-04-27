// app/api/purchases/route.ts (Next.js) o similar

import { createPurchase } from "@/lib/purchases/createPurchase";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log(">>>>body", body);
        const purchase = await createPurchase(body);
        console.log(purchase);
        return Response.json(
            {
                success: true,
                data: purchase,
            },
            { status: 201 },
        );
    } catch (error) {
        // Errores de validación de Zod
        console.log(">>>error", error);
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

        // Otros errores
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
