import { NextResponse } from "next/server";
import { findProductsByCode } from "@/services/pendingSales/findProductsByCode";
import { suggestCodeField } from "@/lib/scan/productCode";
import { getAdminActor, handlePendingSaleError, unauthorized } from "../adminSession";

/** Busca productos por código escaneado (GTIN, SKU o MPN): `?code=...` */
export async function GET(req: Request) {
    if (!(await getAdminActor())) return unauthorized();
    try {
        const code = new URL(req.url).searchParams.get("code") ?? "";
        const products = await findProductsByCode(code);
        return NextResponse.json({
            success: true,
            data: products,
            // Si no se encontró, campo sugerido para vincular el código a un producto
            suggestedField: suggestCodeField(code.trim()),
        });
    } catch (error) {
        return handlePendingSaleError(error, "Error buscando el código");
    }
}
