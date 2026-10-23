import { connectDB } from "@/lib/mongodb";
import { DistributorCategorySeenModel } from "@/models/DistributorCategorySeen";
import type { ElitCategoryParam } from "@/types/shared/comparatorCategory";

/**
 * Elit no tiene endpoint de categorías: guardamos las que traen sus productos
 * para ofrecerlas como sugerencias en el mapeo del comparador.
 */
export async function recordElitCategories(
    values: { paramType: ElitCategoryParam; value: string }[],
): Promise<void> {
    const unique = new Map<string, { paramType: ElitCategoryParam; value: string }>();
    for (const v of values) {
        const value = v.value.trim();
        if (value) unique.set(`${v.paramType}|${value}`, { paramType: v.paramType, value });
    }
    if (unique.size === 0) return;

    await connectDB();

    const now = new Date();
    await DistributorCategorySeenModel.bulkWrite(
        [...unique.values()].map((v) => ({
            updateOne: {
                filter: { distributor: "elit", paramType: v.paramType, value: v.value },
                update: { $set: { lastSeenAt: now } },
                upsert: true,
            },
        })),
        { ordered: false },
    );
}
