import { after } from "next/server";
import type { NormalizedProduct } from "@/types/shared/distributor";
import type {
    ComparatorCategoryDTO,
    ElitCategoryMapping,
    ElitCategoryParam,
} from "@/types/shared/comparatorCategory";
import { toNewBytesCategoryParam } from "@/lib/distributors/comparatorCategoryDefaults";
import { getComparatorCategoryByKey } from "./categories/getComparatorCategoryByKey";
import { recordElitCategories } from "./categories/recordElitCategories";
import { getNewBytesToken } from "./newbytes/getNewBytesToken";
import { searchInvidCatalog } from "./invid/searchInvidCatalog";
import { scheduleInvidSyncIfStale } from "./invid/scheduleInvidSyncIfStale";
import { searchAirCatalog } from "./air/searchAirCatalog";

/**
 * Busca en los distribuidores habilitados. `category` es la clave de una categoría del
 * comparador (ComparatorCategory); a un distribuidor sin mapeo para esa categoría no se le consulta.
 */
export async function getDistributorProducts(
    searchQuery: string,
    category: string = "",
    enabledDistributors: string[] = ["elit", "newbytes", "invid", "air"],
): Promise<NormalizedProduct[]> {
    if (!searchQuery && !category) return []; // Optional: return empty if neither is provided

    let mapping: ComparatorCategoryDTO | null = null;
    if (category) {
        mapping = await getComparatorCategoryByKey(category);
        if (!mapping) return [];
    }

    const fetchPromises: Promise<NormalizedProduct[]>[] = [];

    // ==========================================
    // 1. CONDICIONAL: Solo consultamos si están habilitados y tienen mapeo
    // ==========================================
    if (enabledDistributors.includes("elit") && (!mapping || mapping.elit.length > 0)) {
        // Le agregamos el .catch para que si uno falla, devuelva un array vacío
        // y no rompa todo el Promise.all
        fetchPromises.push(
            fetchElit(searchQuery, mapping?.elit ?? []).catch((e) => {
                console.error("Failed to fetch from Elit:", e);
                return [];
            }),
        );
    }

    if (enabledDistributors.includes("newbytes") && (!mapping || mapping.newbytes.length > 0)) {
        fetchPromises.push(
            fetchNewBytes(searchQuery, mapping?.newbytes ?? []).catch((e) => {
                console.error("Failed to fetch from NewBytes:", e);
                return [];
            }),
        );
    }

    if (enabledDistributors.includes("invid") && (!mapping || mapping.invid.length > 0)) {
        fetchPromises.push(
            fetchInvid(searchQuery, mapping?.invid ?? []).catch((e) => {
                console.error("Failed to fetch from INVID:", e);
                return [];
            }),
        );
    }

    if (enabledDistributors.includes("air") && (!mapping || mapping.air.length > 0)) {
        fetchPromises.push(
            fetchAir(searchQuery, mapping?.air ?? []).catch((e) => {
                console.error("Failed to fetch from AIR:", e);
                return [];
            }),
        );
    }

    // ==========================================
    // 2. EJECUTAR LLAMADAS EN PARALELO
    // ==========================================
    const resultsArrays = await Promise.all(fetchPromises);
    const products = resultsArrays.flat();

    // ==========================================
    // 3. ORDENAMIENTO GLOBAL
    // ==========================================
    products.sort((a, b) => a.price - b.price);

    return products;
}

// ==========================================
// ELIT FETCH LOGIC
// ==========================================
async function fetchElit(
    searchQuery: string,
    categories: ElitCategoryMapping[],
): Promise<NormalizedProduct[]> {
    // Una consulta por categoría mapeada (o una sola sin categoría)
    const requests = categories.length > 0 ? categories : [null];
    const results = await Promise.all(
        requests.map((cat) => fetchElitPage(searchQuery, cat)),
    );

    // Sin duplicados si un producto aparece en dos categorías mapeadas
    const seen = new Set<string>();
    return results.flat().filter((prod) => {
        const id = String(prod.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

// Guarda las categorías que trae Elit para sugerirlas en el mapeo, sin demorar la respuesta
function scheduleElitCategoriesRecord(
    products: { categoria?: unknown; sub_categoria?: unknown }[],
) {
    const values: { paramType: ElitCategoryParam; value: string }[] = [];
    for (const prod of products) {
        if (typeof prod.categoria === "string") {
            values.push({ paramType: "categoria", value: prod.categoria });
        }
        if (typeof prod.sub_categoria === "string") {
            values.push({ paramType: "sub_categoria", value: prod.sub_categoria });
        }
    }
    if (values.length === 0) return;

    const record = () =>
        recordElitCategories(values).catch((e) =>
            console.error("Error guardando categorías de Elit:", e),
        );
    try {
        after(record);
    } catch {
        // Fuera de un request (ej: scripts) no hay `after`
        void record();
    }
}

async function fetchElitPage(
    searchQuery: string,
    category: ElitCategoryMapping | null,
): Promise<NormalizedProduct[]> {
    const elitUrl = new URL("https://clientes.elit.com.ar/v1/api/productos");
    if (searchQuery) elitUrl.searchParams.append("nombre", searchQuery);
    if (category) elitUrl.searchParams.append(category.paramType, category.value);
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

    scheduleElitCategoriesRecord(rawData.resultado);

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
// NEWBYTES FETCH LOGIC
// ==========================================
async function fetchNewBytes(
    searchQuery: string,
    categories: string[],
): Promise<NormalizedProduct[]> {
    const token = await getNewBytesToken();

    // 1. Una consulta por categoría mapeada (ej: Motherboards) o una sola búsqueda global
    const nbCategoriesToFetch =
        categories.length > 0 ? categories.map(toNewBytesCategoryParam) : [""];

    // 2. Crear un array de promesas (peticiones) para ejecutar en paralelo
    const fetchPromises = nbCategoriesToFetch.map(async (nbCategoryValue) => {
        const nbUrl = new URL("https://api.nb.com.ar/v1/");

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

// ==========================================
// INVID: COPIA LOCAL DEL CATÁLOGO
// ==========================================
// La API de Invid no tiene búsqueda y limita a 50 requests/hora, así que el catálogo
// se sincroniza en segundo plano (services/distributors/invid) y acá sólo se consulta la DB.
async function fetchInvid(
    searchQuery: string,
    categories: string[],
): Promise<NormalizedProduct[]> {
    await scheduleInvidSyncIfStale().catch((e) =>
        console.error("No se pudo programar la sincronización de Invid:", e),
    );

    return searchInvidCatalog(searchQuery, categories);
}

// ==========================================
// AIR: COPIA LOCAL DE LA LISTA DE PRECIOS
// ==========================================
// AIR no tiene API y su intranet no acepta conexiones desde Vercel: una PC descarga la
// lista y la sube (tools/air-upload → /api/cron/air-import). Acá sólo se consulta la DB.
async function fetchAir(
    searchQuery: string,
    categories: string[],
): Promise<NormalizedProduct[]> {
    return searchAirCatalog(searchQuery, categories);
}
