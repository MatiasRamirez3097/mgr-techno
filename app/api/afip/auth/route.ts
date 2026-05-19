// /app/api/afip/auth/route.ts

import { NextResponse } from "next/server";

import { getAuth } from "@/lib/afip/auth/getAuth";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const ws = searchParams.get("ws") ?? "wsfe";

        const auth = await getAuth(ws);

        return NextResponse.json({
            success: true,

            ...auth,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,

                error: error.message,
            },
            {
                status: 500,
            },
        );
    }
}
