import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const price = parseFloat(body.regular_price || "0");
    const salePrice = body.sale_price ? parseFloat(body.sale_price) : 0;

    const product = await ProductModel.create({
        name: body.name,
        slug:
            body.slug ||
            body.name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
        status: body.status || "publish",
        description: body.description || "",
        shortDescription: body.short_description || "",
        regularPrice: price,
        regularListPrice: Math.round(price * 1.1),
        salePrice,
        manage_stock: body.manage_stock ?? true,
        stock: body.stock_quantity || 0,
        stockStatus: (body.stock_quantity || 0) > 0 ? "instock" : "outofstock",
        weight: parseFloat(body.weight || "0"),
        dimensions: {
            length: parseFloat(body.dimensions?.length || "0"),
            width: parseFloat(body.dimensions?.width || "0"),
            height: parseFloat(body.dimensions?.height || "0"),
        },
        categories:
            body.categories?.map((c: any) => ({
                id: c.id,
                name: c.name || "",
                slug: c.slug || "",
            })) || [],
        featured: body.featured || false,
        sku: body.sku || "",
        image: body.images?.[0]?.src || "",
        images: body.images?.map((img: any) => img.src || img) || [],
    });

    return Response.json({ id: product.wooId });
}
