import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/services/products/createProduct";
import { createProductSchemaRefined } from "@/lib/validators/productSchema";
import { generateUniqueProductSlug } from "@/lib/products/generateUniqueSlug";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        const parsed = createProductSchemaRefined.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues,
                },
                {
                    status: 400,
                },
            );
        }

        const slug = await generateUniqueProductSlug(parsed.data.name);

        const product = await createProduct({
            ...parsed.data,
            slug,
        });

        return NextResponse.json({
            success: true,
            data: product,
            id: product.id,
            product,
        });
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Error al crear producto",
            },
            {
                status: 500,
            },
        );
    }
}
