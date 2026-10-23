import { connectDB } from "@/lib/mongodb";
import { DistributorCategorySeenModel } from "@/models/DistributorCategorySeen";
import { getInvidCategories } from "@/services/distributors/invid/getInvidCategories";
import { getAirCategories } from "@/services/distributors/air/getAirCategories";
import { getNewBytesToken } from "@/services/distributors/newbytes/getNewBytesToken";
import type {
    DistributorCategoryOption,
    DistributorCategoryOptions,
    ElitCategoryParam,
} from "@/types/shared/comparatorCategory";

async function getNewBytesCategories(): Promise<DistributorCategoryOption[]> {
    const token = await getNewBytesToken();
    const response = await fetch("https://api.nb.com.ar/v1/categories", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
        throw new Error(`NewBytes respondió HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];

    return data
        .map((c: { id?: string | number; description?: string }) => ({
            value: (c.description || "").trim(),
            label: (c.description || "").trim(),
            detail: c.id !== undefined ? `ID ${c.id}` : undefined,
        }))
        .filter((c) => c.value)
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

async function getElitSeenCategories(): Promise<DistributorCategoryOptions["elit"]> {
    await connectDB();
    const seen = await DistributorCategorySeenModel.find({ distributor: "elit" })
        .sort({ value: 1 })
        .lean<{ paramType: ElitCategoryParam; value: string }[]>();

    const result: DistributorCategoryOptions["elit"] = { categoria: [], sub_categoria: [] };
    for (const s of seen) {
        result[s.paramType]?.push({ value: s.value, label: s.value });
    }
    return result;
}

/**
 * Listados de categorías de cada distribuidor para el formulario de mapeo:
 * NewBytes desde su API, Invid y AIR desde sus catálogos locales y Elit desde las vistas en búsquedas.
 */
export async function getDistributorCategoryOptions(): Promise<DistributorCategoryOptions> {
    const errors: string[] = [];

    const [elit, newbytes, invid, air] = await Promise.all([
        getElitSeenCategories().catch((e) => {
            console.error("Error leyendo categorías de Elit:", e);
            errors.push("Elit");
            return { categoria: [], sub_categoria: [] };
        }),
        getNewBytesCategories().catch((e) => {
            console.error("Error obteniendo categorías de NewBytes:", e);
            errors.push("NewBytes");
            return [];
        }),
        getInvidCategories()
            .then((cats) =>
                cats.map((c) => ({
                    value: c.id,
                    label: c.name,
                    detail: [c.parentName, `${c.count} art.`].filter(Boolean).join(" · "),
                })),
            )
            .catch((e) => {
                console.error("Error leyendo categorías de Invid:", e);
                errors.push("Invid");
                return [];
            }),
        getAirCategories()
            .then((cats) =>
                cats.map((c) => ({
                    value: c.id,
                    label: c.name,
                    detail: `${c.id} · ${c.count} art.`,
                })),
            )
            .catch((e) => {
                console.error("Error leyendo categorías de AIR:", e);
                errors.push("AIR");
                return [];
            }),
    ]);

    return { elit, newbytes, invid, air, errors };
}
