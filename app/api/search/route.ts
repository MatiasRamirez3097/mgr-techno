// app/api/search/route.ts
import { NextRequest } from "next/server";
import { WOO_HEADERS } from "@/lib/woo";

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get("q");
    if (!query || query.length < 2) return Response.json([]);

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=20&_fields=id,name,slug,price,images,stock_status`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );

    const data = (await res.json()) as any[];

    // Filtramos solo los que tienen el término en el nombre
    const queryLower = query.toLowerCase();
    const results = data
        .filter((p) => p.name.toLowerCase().includes(queryLower))
        .slice(0, 6)
        .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: parseFloat(p.price || "0"),
            image: p.images?.[0]?.src || "",
            inStock: p.stock_status === "instock",
        }));

    return Response.json(results);
}
