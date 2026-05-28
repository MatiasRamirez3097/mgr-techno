// app/api/products/route.ts
import { getProducts } from "@/services/products/getProducts";

export async function GET() {
    const products = await getProducts();
    return Response.json(products);
}
