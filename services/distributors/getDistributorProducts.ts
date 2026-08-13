interface NormalizedProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
    link: string | null;
}

type CategoryConfig = {
    elit: { paramType: "categoria" | "sub_categoria"; value: string };
    newbytes: string | string[]; // <--- Ahora puede ser un array
};

const CATEGORY_MAP: Record<string, CategoryConfig> = {
    MEMORIAS: {
        elit: { paramType: "categoria", value: "Memorias" },
        newbytes: "Memorias",
    },
    PROCESADORES: {
        elit: { paramType: "sub_categoria", value: "Procesadores" },
        newbytes: "PROCESADORES",
    },
    MOTHERBOARDS: {
        elit: { paramType: "sub_categoria", value: "Motherboards" },
        // Pasamos un array con todas las subdivisiones de NewBytes
        newbytes: ["MOTHER-ASUS", "MOTHER-ASROCK", "MOTHER-GIGABYTE"],
    },
    CONECTIVIDAD: {
        elit: { paramType: "categoria", value: "CONECTIVIDAD" },
        newbytes: "CONECTIVIDAD",
    },
    "CASA-INTELIGENTE": {
        elit: { paramType: "categoria", value: "SMART HOME" }, // Example: if Elit calls it differently
        newbytes: "CASA-INTELIGENTE",
    },
    // Add all your categories from CategorySelect.tsx here...
};

export async function getDistributorProducts(
    searchQuery: string,
    category: string = "",
): Promise<NormalizedProduct[]> {
    //if (!searchQuery && !category) return []; // Optional: return empty if neither is provided

    const [elitResult, newBytesResult] = await Promise.allSettled([
        fetchElit(searchQuery, category),
        fetchNewBytes(searchQuery, category),
    ]);

    const products: NormalizedProduct[] = [];

    if (elitResult.status === "fulfilled") products.push(...elitResult.value);
    else console.error("Failed to fetch from Elit:", elitResult.reason);

    if (newBytesResult.status === "fulfilled")
        products.push(...newBytesResult.value);
    else console.error("Failed to fetch from NewBytes:", newBytesResult.reason);

    // ==========================================
    // ORDENAMIENTO GLOBAL
    // ==========================================
    // Ordenamos todo el array combinado por precio (de menor a mayor)
    products.sort((a, b) => a.price - b.price);

    return products;
}

// ==========================================
// ELIT FETCH LOGIC
// ==========================================
async function fetchElit(
    searchQuery: string,
    category: string,
): Promise<NormalizedProduct[]> {
    const elitUrl = new URL("https://clientes.elit.com.ar/v1/api/productos");
    if (searchQuery) elitUrl.searchParams.append("nombre", searchQuery);

    // 2. Append category to Elit's query parameters
    if (category) {
        const mappedCategory = CATEGORY_MAP[category];

        if (mappedCategory) {
            // Append as 'categoria' or 'sub_categoria' based on the dictionary
            elitUrl.searchParams.append(
                mappedCategory.elit.paramType,
                mappedCategory.elit.value,
            );
        } else {
            // Fallback in case a category is not in the dictionary yet
            elitUrl.searchParams.append("categoria", category);
        }
    }

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
            image: prod.imagenes?.[0] || null,
            link: prod.link || null,
        }));
}

// ==========================================
// NEWBYTES FETCH LOGIC & AUTHENTICATION
// ==========================================

// Simple in-memory cache to prevent spamming the login endpoint on every search
let cachedNbToken: string | null = null;
let nbTokenExpiration: number = 0;

async function getNewBytesToken(): Promise<string | null> {
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
    category: string,
): Promise<NormalizedProduct[]> {
    const token = await getNewBytesToken();

    // 1. Determinar qué categorías de NB buscar
    let nbCategoriesToFetch: string[] = [];

    if (category) {
        const mappedCategory = CATEGORY_MAP[category];
        if (mappedCategory) {
            // Si es un array (ej: Motherboards), lo usamos. Si es string, lo convertimos a array de 1 elemento.
            nbCategoriesToFetch = Array.isArray(mappedCategory.newbytes)
                ? mappedCategory.newbytes
                : [mappedCategory.newbytes];
        } else {
            nbCategoriesToFetch = [category];
        }
    } else {
        // Si no hay categoría seleccionada, hacemos una sola búsqueda global
        nbCategoriesToFetch = [""];
    }

    // 2. Crear un array de promesas (peticiones) para ejecutar en paralelo
    const fetchPromises = nbCategoriesToFetch.map(async (nbCategoryValue) => {
        let baseUrl = "https://api.nb.com.ar/v1/";
        const nbUrl = new URL(baseUrl);

        if (nbCategoryValue) {
            nbUrl.searchParams.append("category", nbCategoryValue);
        }

        if (searchQuery) {
            nbUrl.searchParams.append("title", searchQuery);
        }

        nbUrl.searchParams.append("available_stock", "1");
        nbUrl.searchParams.append("order", "price_asc");

        const response = await fetch(nbUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(
                `NewBytes HTTP error: ${response.status} for category ${nbCategoryValue}`,
            );
        }

        const rawData = await response.json();

        if (!Array.isArray(rawData)) {
            return []; // Retornamos vacío si falla la estructura
        }

        let productsArray = rawData;

        // Safety Fallback local
        if (nbCategoryValue && searchQuery) {
            productsArray = productsArray.filter(
                (prod: any) =>
                    prod.title &&
                    prod.title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
            );
        }

        return productsArray.map((prod: any) => {
            const stockValue = Number(prod.amountStock) || 0;
            let priceInArs = 0;

            if (prod.price && typeof prod.price === "object") {
                const finalPriceUsd = Number(prod.price.finalPrice) || 0;
                const exchangeRate = Number(prod.cotizacion) || 1;
                priceInArs = finalPriceUsd * exchangeRate;
            }

            // Lógica para armar la URL de NewBytes
            // Convertimos a minúscula y reemplazamos cualquier caracter que NO sea letra o número por un guión "-"
            const slug = prod.title
                ? prod.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                : "";
            const nbLink = `https://www.nb.com.ar/${slug}_-_${prod.id}`;

            return {
                id: prod.id,
                distributor: "NewBytes",
                sku: prod.sku || prod.id.toString(),
                name: prod.title,
                price: priceInArs,
                stock: stockValue,
                image: prod.mainImage || null,
                link: nbLink,
            };
        });
    });

    // 3. Ejecutar TODAS las peticiones al mismo tiempo y esperar a que terminen
    const results = await Promise.allSettled(fetchPromises);

    // 4. Combinar todos los resultados en un solo array
    const combinedProducts: NormalizedProduct[] = [];

    for (const result of results) {
        if (result.status === "fulfilled") {
            // .push(...array) agrega todos los elementos al array principal
            combinedProducts.push(...result.value);
        } else {
            console.error(
                "Error fetching a NewBytes subcategory:",
                result.reason,
            );
        }
    }

    return combinedProducts;
}
