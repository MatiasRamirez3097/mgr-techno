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
    const salePrice = body.sale_price ? parseFloat(body.sale_price) : null;
    const effectivePrice = salePrice || price;

    const images =
        body.images
            ?.map((img: any) => (typeof img === "string" ? img : img.src))
            .filter(Boolean) || [];

    // Generamos un wooId temporal negativo para no colisionar con los de Woo
    const lastProduct = await ProductModel.findOne().sort({ wooId: -1 }).lean();
    const tempWooId = lastProduct
        ? Math.max((lastProduct as any).wooId + 1, 1000000)
        : 1000000;

    const product = await ProductModel.create({
        wooId: tempWooId,
        name: body.name,
        slug:
            body.slug ||
            body.name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
        status: body.status || "publish",
        shortDescription: body.short_description || "",
        description: body.description || "",
        regularPrice: price,
        regularListPrice: Math.round(price * 1.1),
        salePrice: salePrice || 0,
        price: effectivePrice,
        listPrice: Math.round(effectivePrice * 1.1),
        onSale: !!salePrice,
        manage_stock: body.manage_stock ?? true,
        stock: body.manage_stock ? parseInt(body.stock_quantity) || 0 : null,
        stockStatus:
            (body.manage_stock && parseInt(body.stock_quantity) > 0) ||
            !body.manage_stock
                ? "instock"
                : "outofstock",
        weight: parseFloat(body.weight || "0"),
        dimensions: {
            length: parseFloat(body.dimensions?.length || "0"),
            width: parseFloat(body.dimensions?.width || "0"),
            height: parseFloat(body.dimensions?.height || "0"),
        },
        categories:
            body.categories?.map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
            })) || [],
        featured: body.featured || false,
        image: images[0] || "",
        images,
        syncedAt: new Date(),
    });

    return Response.json({ id: product.wooId });
}
