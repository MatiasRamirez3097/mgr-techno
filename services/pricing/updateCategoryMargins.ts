import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import { categoryMarginsSchema } from "@/lib/validators/pricingSchema";

/** Guarda los márgenes de varias categorías de una vez (null = hereda / usa el general). */
export async function updateCategoryMargins(data: unknown): Promise<number> {
    const parsed = categoryMarginsSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Márgenes inválidos");
    }
    const categories = parsed.data.categories.filter((c) => isValidObjectId(c.id));
    if (categories.length === 0) return 0;

    await connectDB();
    const result = await CategoryModel.bulkWrite(
        categories.map((c) => ({
            updateOne: {
                filter: { _id: c.id },
                update: {
                    $set: {
                        targetMarginPercent: c.targetMarginPercent,
                        minMarginPercent: c.minMarginPercent,
                    },
                },
            },
        })),
    );
    return result.modifiedCount;
}
