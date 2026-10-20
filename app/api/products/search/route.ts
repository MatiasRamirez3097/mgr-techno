import { searchProducts } from "@/services/products/searchProducts";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const query = searchParams.get("q") || "";
        const statusAll = searchParams.get("statusAll");
        const admin = searchParams.get("admin");
        const excludeBundles = searchParams.get("excludeBundles");

        const products = await searchProducts(query, {
            allStatus:
                statusAll === "true" || statusAll === "1" ? true : undefined,
            adminMode:
                admin === "true" ||
                admin === "1" ||
                statusAll === "true" ||
                statusAll === "1",
            excludeBundles:
                excludeBundles === "true" || excludeBundles === "1",
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
