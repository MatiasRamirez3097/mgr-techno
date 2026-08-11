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

    // Launch both requests in parallel to reduce loading times
    const [elitResult, newBytesResult] = await Promise.allSettled([
        fetchElit(searchQuery),
        fetchNewBytes(searchQuery),
    ]);

    const products: NormalizedProduct[] = [];

    // If Elit was successful, add its products to the main array
    if (elitResult.status === "fulfilled") {
        products.push(...elitResult.value);
    } else {
        console.error("Failed to fetch from Elit:", elitResult.reason);
    }

    // If NewBytes was successful, add its products to the main array
    if (newBytesResult.status === "fulfilled") {
        products.push(...newBytesResult.value);
    } else {
        console.error("Failed to fetch from NewBytes:", newBytesResult.reason);
    }

    return products;
}

// ==========================================
// ELIT FETCH LOGIC
// ==========================================
async function fetchElit(searchQuery: string): Promise<NormalizedProduct[]> {
    const elitUrl = new URL("https://clientes.elit.com.ar/v1/api/productos");
    elitUrl.searchParams.append("nombre", searchQuery);
    elitUrl.searchParams.append("limit", "50");

    const response = await fetch(elitUrl.toString(), {
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

    if (!response.ok) throw new Error(`Elit HTTP error: ${response.status}`);

    const rawData = await response.json();

    if (rawData.codigo !== 200 || !Array.isArray(rawData.resultado)) {
        throw new Error("Elit returned an unexpected data structure");
    }

    // We chain .filter() before .map() to remove out-of-stock items
    return rawData.resultado
        .filter((prod: any) => Number(prod.stock_total) > 0)
        .map((prod: any) => ({
            id: prod.id,
            distributor: "Elit",
            sku: prod.codigo_producto || prod.id.toString(),
            name: prod.marca ? `${prod.marca} ${prod.nombre}` : prod.nombre,
            price: Number(prod.pvp_ars) || 0,
            stock: Number(prod.stock_total) || 0,
            image: prod.imagen || null,
        }));
}

// ==========================================
// NEWBYTES FETCH LOGIC & AUTHENTICATION
// ==========================================

// Simple in-memory cache to prevent spamming the login endpoint on every search
let cachedNbToken: string | null = null;
let nbTokenExpiration: number = 0;

async function getNewBytesToken(): Promise<string> {
    // Return cached token if it exists and hasn't expired (e.g., valid for 55 minutes)
    if (cachedNbToken && Date.now() < nbTokenExpiration) {
        return cachedNbToken;
    }

    const loginUrl = "https://api.nb.com.ar/v1/auth/login";

    const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user: process.env.NEWBYTES_USER,
            password: process.env.NEWBYTES_PASSWORD,
            mode: "api",
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`NewBytes Auth failed: ${response.status}`);
    }

    const data = await response.json();

    // WARNING: Adjust 'data.token' if the API returns the token under a different key
    // (for example, data.data.token or data.access_token)
    const token = data.token;

    if (!token) {
        throw new Error(
            "NewBytes Auth successful but no token found in response.",
        );
    }

    // Save token to cache and set expiration to 55 minutes from now
    // (assuming the token lasts 1 hour, this gives a 5-minute safety margin)
    cachedNbToken = token;
    nbTokenExpiration = Date.now() + 55 * 60 * 1000;

    return cachedNbToken;
}

async function fetchNewBytes(
    searchQuery: string,
): Promise<NormalizedProduct[]> {
    // 1. Get the token
    const token = await getNewBytesToken();

    // 2. Perform the product search
    const nbUrl = new URL("https://api.nb.com.ar/v1/");
    nbUrl.searchParams.append("title", searchQuery);
    nbUrl.searchParams.append("available_stock", "1");
    const response = await fetch(nbUrl.toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`NewBytes HTTP error: ${response.status}`);
    }

    const rawData = await response.json();

    if (!Array.isArray(rawData)) {
        throw new Error("NewBytes did not return an array");
    }

    return rawData.map((prod: any) => {
        // Safe extraction of stock
        const stockValue = Number(prod.amountStock) || 0;

        // Safe extraction and conversion of price (USD -> ARS)
        let priceInArs = 0;

        // Check if price exists and is an object (it can be null for out-of-stock items)
        if (prod.price && typeof prod.price === "object") {
            const finalPriceUsd = Number(prod.price.finalPrice) || 0;
            const exchangeRate = Number(prod.cotizacion) || 1; // Default to 1 to avoid multiplying by 0

            priceInArs = finalPriceUsd * exchangeRate;
        }

        return {
            id: prod.id,
            distributor: "NewBytes",
            sku: prod.sku || prod.id.toString(),
            name: prod.title,
            price: priceInArs,
            stock: stockValue,
            image: prod.mainImage || null,
        };
    });
}
