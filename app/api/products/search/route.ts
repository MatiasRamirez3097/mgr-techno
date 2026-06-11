import { searchProducts } from "@/services/products/searchProducts";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const query = searchParams.get("q") || "";

        const status = searchParams.get("statusAll") || undefined;

        const products = await searchProducts(query, {
            allStatus: status ? Boolean(status) : undefined,
        });

        return Response.json(products);
    } catch {
        return Response.json(
            {
                error: "Error buscando productos",
            },
            {
                status: 500,
            },
        );
    }
}
