import { NextRequest } from "next/server";
import { createProduct } from "@/lib/products/createProduct";
import { createProductSchemaRefined } from "@/lib/validators/productSchema";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = createProductSchemaRefined.safeParse(body);

    if (!parsed.success) {
        return Response.json({ error: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // 👉 acá ya está todo validado

    const product = await createProduct(data);

    return Response.json(product);
}
