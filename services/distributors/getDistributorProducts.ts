interface NormalizedProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
}

export async function getDistributorProducts(
    searchQuery: string,
): Promise<NormalizedProduct[]> {
    if (!searchQuery) return [];

    try {
        const elitUrl = new URL(
            "https://clientes.elit.com.ar/v1/api/productos",
        );
        elitUrl.searchParams.append("nombre", searchQuery);
        elitUrl.searchParams.append("limit", "50");

        const elitResponse = await fetch(elitUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: Number(process.env.ELIT_USER_ID),
                token: process.env.ELIT_TOKEN,
            }),
            cache: "no-store",
        });

        if (!elitResponse.ok) {
            console.error(`Elit API Error: ${elitResponse.status}`);
            return [];
        }

        const rawData = await elitResponse.json();

        // Ensure the API returned a 200 code and the 'resultado' array exists
        if (rawData.codigo !== 200 || !Array.isArray(rawData.resultado)) {
            console.error("Elit API returned an unexpected format:", rawData);
            return [];
        }

        const productsArray = rawData.resultado;

        // Map the correct fields from the Elit JSON response
        const elitProducts: NormalizedProduct[] = productsArray.map(
            (prod: any) => ({
                id: prod.id,
                distributor: "Elit",
                // Fallback to ID if standard SKU is missing
                sku: prod.codigo_producto || prod.id.toString(),
                // Prepend brand to name for better readability if available
                name: prod.marca ? `${prod.marca} ${prod.nombre}` : prod.nombre,
                price: Number(prod.pvp_ars) || 0,
                stock: Number(prod.stock_total) || 0,
                image: prod.imagen || null,
            }),
        );

        return elitProducts;
    } catch (error) {
        console.error("Error fetching distributors:", error);
        return [];
    }
}
