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

        const dataElit: any[] = await elitResponse.json();

        const elitProducts: NormalizedProduct[] = dataElit.map((prod) => ({
            id: prod.id,
            distributor: "Elit",
            sku: prod.codigo_producto,
            name: prod.nombre,
            price: Number(prod.precio) || 0,
            stock: Number(prod.stock) || 0,
            image: prod.imagen || null,
        }));

        return elitProducts;
    } catch (error) {
        console.error("Error fetching distributors:", error);
        return [];
    }
}
