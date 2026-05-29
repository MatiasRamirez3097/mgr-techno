import { NextRequest } from "next/server";

import { createProduct } from "@/services/products/createProduct";

import { createProductSchemaRefined } from "@/lib/validators/productSchema";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const parsed = createProductSchemaRefined.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                {
                    error: parsed.error.issues,
                },
                {
                    status: 400,
                },
            );
        }

        const product = await createProduct(parsed.data);

        return Response.json({
            success: true,
            product,
        });
    } catch (error: any) {
        return Response.json(
            {
                error: error?.message || "Error al crear producto",
            },
            {
                status: 500,
            },
        );
    }
}
