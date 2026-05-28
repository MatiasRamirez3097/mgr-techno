// /api/products/search/route.ts

import { NextRequest } from "next/server";
import { getProducts } from "@/lib/products/getProducts";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q") || "";
    const s = req.nextUrl.searchParams.get("s") || "";

    if (q.trim().length < 2) {
        return Response.json({
            products: [],
        });
    }

    const result = await getProducts({
        search: q,
        page: 1,
    });

    // Filtrar stock si corresponde
    const products =
        s === "y"
            ? result.products.filter(
                  (p) => p.availableStock && p.availableStock > 0,
              )
            : result.products;

    return Response.json({
        products: products.slice(0, 10).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            sku: p.sku,
            image: p.image,
            taxRate: p.taxRate,
            regularPrice: p.regularPrice,
            weight: p.weight,
            dimensions: p.dimensions,
            availableStock: p.availableStock,
        })),
    });
}
