import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import { createProduct } from "@/lib/products/createProduct";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const product = await createProduct(body);

    return Response.json({
        success: true,
        data: product,
    });
}
