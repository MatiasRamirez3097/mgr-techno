import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { signUploadRequest } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const paramsToSign = body.paramsToSign || body;

        if (!paramsToSign || typeof paramsToSign !== "object") {
            return NextResponse.json(
                { error: "Parámetros de firma inválidos" },
                { status: 400 },
            );
        }

        const { signature, apiKey, cloudName, timestamp } = signUploadRequest(paramsToSign);

        return NextResponse.json({
            signature,
            apiKey,
            cloudName,
            timestamp,
        });
    } catch (err: unknown) {
        console.error("Error signing Cloudinary request:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al firmar solicitud" },
            { status: 500 },
        );
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        return NextResponse.json({
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
        });
    } catch {
        return NextResponse.json(
            { error: "Error al obtener configuración de Cloudinary" },
            { status: 500 },
        );
    }
}
