import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const price = parseFloat(body.regular_price || "0");
    const salePrice = body.sale_price ? parseFloat(body.sale_price) : null;
    const effectivePrice = salePrice || price;

    const images =
        body.images
            ?.map((img: any) => (typeof img === "string" ? img : img.src))
            .filter(Boolean) || [];

    const updateData = {
        name: body.name,
        slug: body.slug,
        status: body.status,
        shortDescription: body.short_description || "",
        description: body.description || "",
        regularPrice: price,
        regularListPrice: Math.round(price * 1.1),
        salePrice: salePrice || 0,
        price: effectivePrice,
        listPrice: Math.round(effectivePrice * 1.1),
        onSale: !!salePrice,
        manage_stock: body.manage_stock,
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
    };

    const product = await ProductModel.findOneAndUpdate(
        { wooId: parseInt(id) },
        updateData,
        { new: true },
    );

    if (!product)
        return Response.json(
            { error: "Producto no encontrado" },
            { status: 404 },
        );
    return Response.json({ ok: true });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    await ProductModel.findOneAndDelete({ wooId: parseInt(id) });
    return Response.json({ ok: true });
}
