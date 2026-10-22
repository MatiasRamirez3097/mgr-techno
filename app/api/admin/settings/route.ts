import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getStoreSettings } from "@/services/settings/getStoreSettings";
import { updateStoreSettings } from "@/services/settings/updateStoreSettings";

export async function GET() {
    const settings = await getStoreSettings();
    return NextResponse.json(settings);
}

export async function PUT(req: Request) {
    try {
        const settings = await updateStoreSettings(await req.json());
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: "El recargo debe ser un número entre 0 y 100" },
                { status: 400 },
            );
        }
        console.error("Error actualizando configuración:", error);
        return NextResponse.json(
            { error: "Error actualizando configuración" },
            { status: 500 },
        );
    }
}
