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
import { requestNewBytesProducts } from "./newbytes/requestNewBytesProducts";
import { requestElitProducts } from "./elit/requestElitProducts";
import { mapElitProduct } from "@/lib/distributors/elitMapper";
import { mapNewBytesProduct } from "@/lib/distributors/newbytesMapper";
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
    const params: Record<string, string | number> = { limit: 50 };
    if (searchQuery) params.nombre = searchQuery;
    if (category) params[category.paramType] = category.value;

    const { items } = await requestElitProducts(params);

    scheduleElitCategoriesRecord(items as { categoria?: unknown; sub_categoria?: unknown }[]);

    // En el comparador sólo interesan los que tienen stock
    return items.filter((prod) => Number(prod.stock_total) > 0).map(mapElitProduct);
}

// ==========================================
// NEWBYTES FETCH LOGIC
// ==========================================
async function fetchNewBytes(
    searchQuery: string,
    categories: string[],
): Promise<NormalizedProduct[]> {
    // 1. Una consulta por categoría mapeada (ej: Motherboards) o una sola búsqueda global
    const nbCategoriesToFetch =
        categories.length > 0 ? categories.map(toNewBytesCategoryParam) : [""];

    // 2. Las consultas por categoría van en paralelo
    const fetchPromises = nbCategoriesToFetch.map(async (nbCategoryValue) => {
        let productsArray = await requestNewBytesProducts({
            category: nbCategoryValue,
            title: searchQuery,
            available_stock: "1",
            order: "price_asc",
        });

        // Safety Fallback local
        if (nbCategoryValue && searchQuery) {
            productsArray = productsArray.filter((prod) =>
                prod.title?.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        }

        return productsArray.map(mapNewBytesProduct);
    });

    // 3. Si falla una categoría, se muestran las demás
    const results = await Promise.allSettled(fetchPromises);

    const combinedProducts: NormalizedProduct[] = [];
    for (const result of results) {
        if (result.status === "fulfilled") {
            combinedProducts.push(...result.value);
        } else {
            console.error("Error fetching a NewBytes subcategory:", result.reason);
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
