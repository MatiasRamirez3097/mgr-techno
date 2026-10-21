import { ProductModel } from "@/models/Product";
import { slugify } from "@/lib/utils/slugify";

export async function generateUniqueProductSlug(
    name: string,
    excludeProductId?: string,
): Promise<string> {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let counter = 1;

    while (
        await ProductModel.exists({
            slug: candidate,
            ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
        })
    ) {
        counter++;
        candidate = `${baseSlug}-${counter}`;
    }

    return candidate;
}
