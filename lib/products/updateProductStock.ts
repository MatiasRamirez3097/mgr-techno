import { ProductModel } from "@/models";
import { recalculateBundlesForProducts } from "./recalculateBundlesStock";

async function applySingleProductStockDelta(
    targetProductId: any,
    availableDelta: number,
    reservedDelta: number,
    session: any,
) {
    if (availableDelta < 0) {
        const current = await ProductModel.findById(targetProductId)
            .select("name availableStock")
            .session(session)
            .lean();

        if (!current) {
            throw new Error("Producto no encontrado al actualizar stock");
        }

        const currentAvailable = Number(current.availableStock) || 0;
        if (currentAvailable + availableDelta < 0) {
            throw new Error(
                `Stock insuficiente para "${current.name}" (disponible: ${currentAvailable}, requerido: ${Math.abs(availableDelta)})`,
            );
        }
    }

    await ProductModel.updateOne(
        { _id: targetProductId },
        [
            {
                $set: {
                    availableStock: {
                        $add: ["$availableStock", availableDelta],
                    },
                    reservedStock: {
                        $add: ["$reservedStock", reservedDelta],
                    },
                },
            },
            {
                $set: {
                    isAvailable: {
                        $gt: ["$availableStock", 0],
                    },
                },
            },
        ],
        {
            session,
            updatePipeline: true,
        },
    );
}

export async function updateProductStock(
    productId: string,
    availableDelta: number,
    reservedDelta: number,
    session: any,
    customComponents?: {
        productId: any;
        quantityPerBundle?: number;
        quantity?: number;
    }[],
) {
    // 1. Si el ítem de la orden trae componentes explícitos (PC Armada o Combo con snapshot)
    if (Array.isArray(customComponents) && customComponents.length > 0) {
        const affectedComponentIds: string[] = [];

        for (const comp of customComponents) {
            const qty = Math.max(
                1,
                Number(comp.quantityPerBundle ?? comp.quantity) || 1,
            );
            await applySingleProductStockDelta(
                comp.productId,
                availableDelta * qty,
                reservedDelta * qty,
                session,
            );
            affectedComponentIds.push(comp.productId.toString());
        }

        await recalculateBundlesForProducts(affectedComponentIds, session);
        return;
    }

    const product = await ProductModel.findById(productId)
        .select("name type bundleItems")
        .session(session)
        .lean();

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    if (
        product.type === "bundle" &&
        product.bundleItems &&
        product.bundleItems.length > 0
    ) {
        const affectedComponentIds: string[] = [];

        for (const bi of product.bundleItems) {
            const qty = Math.max(1, Number(bi.quantity) || 1);
            await applySingleProductStockDelta(
                bi.productId,
                availableDelta * qty,
                reservedDelta * qty,
                session,
            );
            affectedComponentIds.push(bi.productId.toString());
        }

        await recalculateBundlesForProducts(affectedComponentIds, session);
    } else {
        await applySingleProductStockDelta(
            productId,
            availableDelta,
            reservedDelta,
            session,
        );

        await recalculateBundlesForProducts([productId], session);
    }
}
