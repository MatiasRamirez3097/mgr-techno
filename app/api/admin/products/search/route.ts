import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    await connectDB();

    const q = req.nextUrl.searchParams.get("q") || "";

    if (q.length < 2) {
        return Response.json({ products: [] });
    }

    const products = await ProductModel.find({
        name: { $regex: q, $options: "i" },
        status: "publish",
    })
        .limit(10)
        .lean();

    return Response.json({
        products: products.map((p) => ({
            id: p._id.toString(),
            name: p.name,
        })),
    });
}
