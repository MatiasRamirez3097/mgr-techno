import { getToken } from "@/lib/afip";

export async function GET() {
    try {
        const data = await getToken();

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
