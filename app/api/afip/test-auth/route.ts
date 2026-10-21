import { getAuth } from "@/lib/afip/auth/getAuth";

export async function GET() {
    try {
        const data = await getAuth("wsfe");

        return Response.json({
            success: true,
            ...data,
        });
    } catch (error: any) {
        return Response.json({
            success: false,
            error: error.message,
        });
    }
}
