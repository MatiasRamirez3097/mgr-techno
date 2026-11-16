import { ProductModel } from "@/models/Product";
import type { QuoteItemDTO } from "@/types/shared/quote";

/**
 * Un combo no puede ser componente de una PC Armada (mismo criterio que createAdminOrder):
 * su stock es virtual y no se podría reservar al convertir el presupuesto en pedido.
 */
export async function assertNoBundleComponents(
    items: Pick<QuoteItemDTO, "isCustomPc" | "components">[],
): Promise<void> {
    const productIds = items
        .filter((it) => it.isCustomPc)
        .flatMap((it) => it.components || [])
        .map((c) => c.productId)
        .filter((id): id is string => Boolean(id));

    if (productIds.length === 0) return;

    const bundles = await ProductModel.find(
        { _id: { $in: productIds }, type: "bundle" },
        { name: 1 },
    ).lean<{ name: string }[]>();

    if (bundles.length > 0) {
        throw new Error(
            `No se puede incluir un combo como componente de una PC Armada: ${bundles
                .map((b) => `"${b.name}"`)
                .join(", ")}`,
        );
    }
}
