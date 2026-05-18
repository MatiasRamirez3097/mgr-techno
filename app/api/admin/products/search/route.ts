import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    await connectDB();

    const q = req.nextUrl.searchParams.get("q") || "";
    const s = req.nextUrl.searchParams.get("s") || "";

    if (q.length < 2) {
        return Response.json({ products: [] });
    }
    let find = {
        name: { $regex: q, $options: "i" },
        status: "publish",
    };

    if (s === "y")
        find = {
            ...find,
            availableStock: { $gt: 0 },
        };
    const products = await ProductModel.find(find).limit(10).lean();

    return Response.json({
        products: products.map((p) => ({
            id: p._id.toString(),
            name: p.name,
            taxRate: p.taxRate,
            regularPrice: p.regularPrice,
            weight: p.weight,
            dimensions: p.dimensions,
        })),
    });
}
