export const revalidate = 3600;

import { buildProductFeedResponse } from "@/lib/feeds/buildProductFeed";

export async function GET() {
    return buildProductFeedResponse("Catálogo de productos para BuscaHard");
}
