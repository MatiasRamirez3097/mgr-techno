import { elitPageOffsets, mapElitProduct } from "@/lib/distributors/elitMapper";
import type { NormalizedProduct } from "@/types/shared/distributor";
import { requestElitProducts } from "./requestElitProducts";

// Hasta esta cantidad conviene consultar uno por uno (?id=); con más, recorrer el catálogo
// (~1.800 productos = ~19 páginas) sale más barato
const MAX_BY_ID = 20;
const BY_ID_CONCURRENCY = 4;
const MAX_PAGES = 60;
const ELIT_MIN_CATALOG_SIZE = 500;

export interface ElitBatchResult {
    found: Map<string, NormalizedProduct>;
    // IDs que se confirmó que ya no están (consulta completa y sin errores)
    missing: Set<string>;
    requests: number;
    errors: string[];
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Trae de Elit (con y sin stock) los productos indicados por su ID. */
export async function fetchElitProductsByIds(ids: string[]): Promise<ElitBatchResult> {
    const wanted = [...new Set(ids)];
    const result: ElitBatchResult = { found: new Map(), missing: new Set(), requests: 0, errors: [] };
    if (wanted.length === 0) return result;

    if (wanted.length <= MAX_BY_ID) {
        const queue = [...wanted];
        const worker = async () => {
            for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
                try {
                    result.requests++;
                    const { items } = await requestElitProducts({ id });
                    const item = items.find((i) => String(i.id) === id);
                    if (item) result.found.set(id, mapElitProduct(item));
                    else result.missing.add(id);
                } catch (err) {
                    result.errors.push(`id ${id}: ${errorMessage(err)}`);
                }
            }
        };
        await Promise.all(Array.from({ length: BY_ID_CONCURRENCY }, worker));
        return result;
    }

    // Catálogo completo, página por página, cortando apenas aparecen todos
    const pending = new Set(wanted);
    let offsets = [1];
    let complete = true;
    for (let i = 0; i < offsets.length && i < MAX_PAGES && pending.size > 0; i++) {
        try {
            result.requests++;
            const { items, total } = await requestElitProducts({ offset: offsets[i] });
            if (i === 0 && total !== null) offsets = elitPageOffsets(total);
            for (const item of items) {
                const id = String(item.id);
                if (pending.delete(id)) result.found.set(id, mapElitProduct(item));
            }
            if (items.length === 0) break;
        } catch (err) {
            result.errors.push(`offset ${offsets[i]}: ${errorMessage(err)}`);
            complete = false;
            break;
        }
    }
    // Un total anormalmente chico (~1.800 productos esperados) es un error de la API
    if (offsets.length > MAX_PAGES || offsets.length * 100 < ELIT_MIN_CATALOG_SIZE) complete = false;

    // Sólo se dan por desaparecidos si se recorrió todo el catálogo sin errores
    if (complete) for (const id of pending) result.missing.add(id);
    return result;
}
