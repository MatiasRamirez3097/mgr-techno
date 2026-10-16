import { Types } from "mongoose";
import { ProductModel } from "@/models/Product";

export interface NormalizedBundleItem {
    productId: Types.ObjectId;
    quantity: number;
}

export interface BundleMetricsResult {
    normalizedBundleItems: NormalizedBundleItem[];
    bundleItemsCount: number;
    regularPrice: number;
    availableStock: number;
    isAvailable: boolean;
}

/**
 * Normaliza los items de un combo (unificando duplicados), valida que existan y sean
 * productos simples, y calcula el regularPrice y availableStock resultantes.
 */
export async function calculateBundleMetrics(
    rawItems: { productId: string; quantity: number }[],
    session?: any,
): Promise<BundleMetricsResult> {
    if (!rawItems || rawItems.length === 0) {
        throw new Error("Un combo debe contener al menos un producto componente");
    }

    // Unificar duplicados sumando cantidades
    const mergedMap = new Map<string, number>();
    for (const item of rawItems) {
        if (!item.productId || !Types.ObjectId.isValid(item.productId)) {
            throw new Error("ID de producto componente inválido");
        }
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        mergedMap.set(item.productId, (mergedMap.get(item.productId) || 0) + qty);
    }

    const componentIds = Array.from(mergedMap.keys()).map(
        (id) => new Types.ObjectId(id),
    );

    const query = ProductModel.find({ _id: { $in: componentIds } }).select(
        "_id name type regularPrice availableStock",
    );
    if (session) {
        query.session(session);
    }
    const components = await query.lean();

    if (components.length !== componentIds.length) {
        throw new Error(
            "Uno o más productos seleccionados para el combo no existen",
        );
    }

    const compMap = new Map<string, any>();
    for (const comp of components) {
        if (comp.type === "bundle") {
            throw new Error(
                `El producto "${comp.name}" ya es un combo. No se puede anidar un combo dentro de otro combo.`,
            );
        }
        compMap.set(comp._id.toString(), comp);
    }

    const normalizedBundleItems: NormalizedBundleItem[] = [];
    let bundleItemsCount = 0;
    let regularPrice = 0;
    let minPossibleBundles = Infinity;

    for (const [idStr, quantity] of mergedMap.entries()) {
        const comp = compMap.get(idStr);
        normalizedBundleItems.push({
            productId: new Types.ObjectId(idStr),
            quantity,
        });
        bundleItemsCount += quantity;
        regularPrice += (Number(comp.regularPrice) || 0) * quantity;

        const compAvailable = Math.max(0, Number(comp.availableStock) || 0);
        const possibleWithThisComp = Math.floor(compAvailable / quantity);
        if (possibleWithThisComp < minPossibleBundles) {
            minPossibleBundles = possibleWithThisComp;
        }
    }

    const availableStock =
        minPossibleBundles === Infinity ? 0 : Math.max(0, minPossibleBundles);

    return {
        normalizedBundleItems,
        bundleItemsCount,
        regularPrice,
        availableStock,
        isAvailable: availableStock > 0,
    };
}

/**
 * Recalcula el stock virtual, el regularPrice y el estado (pasando a pending_review
 * si recupera stock desde 0) de todos los combos que contengan alguno de los productos indicados.
 */
export async function recalculateBundlesForProducts(
    componentProductIds: (string | Types.ObjectId)[],
    session?: any,
) {
    const validIds = componentProductIds
        .map((id) => id.toString())
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

    if (validIds.length === 0) return;

    const bundlesQuery = ProductModel.find({
        type: "bundle",
        "bundleItems.productId": { $in: validIds },
    });
    if (session) {
        bundlesQuery.session(session);
    }
    const bundles = await bundlesQuery.lean();

    if (!bundles || bundles.length === 0) return;

    // Recolectar todos los componentes involucrados en todos los combos afectados
    const allCompIdsSet = new Set<string>();
    for (const bundle of bundles) {
        for (const bi of bundle.bundleItems || []) {
            if (bi.productId) {
                allCompIdsSet.add(bi.productId.toString());
            }
        }
    }

    const allCompObjectIds = Array.from(allCompIdsSet).map(
        (id) => new Types.ObjectId(id),
    );

    const compsQuery = ProductModel.find({
        _id: { $in: allCompObjectIds },
    }).select("_id regularPrice availableStock");
    if (session) {
        compsQuery.session(session);
    }
    const allComponents = await compsQuery.lean();
    const compMap = new Map<string, any>(
        allComponents.map((c: any) => [c._id.toString(), c]),
    );

    for (const bundle of bundles) {
        const items = bundle.bundleItems || [];
        if (items.length === 0) continue;

        let minPossible = Infinity;
        let sumRegularPrice = 0;

        for (const bi of items) {
            const comp = compMap.get(bi.productId.toString());
            const qty = Math.max(1, Number(bi.quantity) || 1);
            if (!comp) {
                minPossible = 0;
            } else {
                const compStock = Math.max(0, Number(comp.availableStock) || 0);
                const possible = Math.floor(compStock / qty);
                if (possible < minPossible) {
                    minPossible = possible;
                }
                sumRegularPrice += (Number(comp.regularPrice) || 0) * qty;
            }
        }

        const newAvailableStock =
            minPossible === Infinity ? 0 : Math.max(0, minPossible);
        const previousAvailableStock = Number(bundle.availableStock) || 0;

        // Si el combo estaba sin stock (0) y recupera stock (> 0), pasa a pending_review si estaba publicado
        const stockRecovered =
            previousAvailableStock === 0 && newAvailableStock > 0;
        let newStatus = bundle.status;
        if (stockRecovered && bundle.status === "publish") {
            newStatus = "pending_review";
        }

        // Asegurar que regularPrice sea mayor a salePrice para mantener consistencia
        let safeRegularPrice =
            sumRegularPrice > 0 ? sumRegularPrice : bundle.regularPrice;
        if (
            bundle.salePrice != null &&
            safeRegularPrice <= Number(bundle.salePrice)
        ) {
            safeRegularPrice = Number(bundle.salePrice) + 1;
            if (bundle.status === "publish") {
                newStatus = "pending_review";
            }
        }

        await ProductModel.updateOne(
            { _id: bundle._id },
            {
                $set: {
                    availableStock: newAvailableStock,
                    totalStock: newAvailableStock,
                    isAvailable: newAvailableStock > 0,
                    regularPrice: safeRegularPrice,
                    status: newStatus,
                },
            },
            session ? { session } : undefined,
        );
    }
}

/**
 * Construye un mapa de componentes con sus nombres reales para guardar el snapshot
 * en OrderItem.bundleComponents cuando se crea una orden con combos.
 */
export async function buildOrderBundleComponentsMap(
    products: any[],
    session?: any,
): Promise<
    Map<
        string,
        {
            productId: Types.ObjectId;
            name: string;
            quantityPerBundle: number;
        }[]
    >
> {
    const result = new Map<
        string,
        {
            productId: Types.ObjectId;
            name: string;
            quantityPerBundle: number;
        }[]
    >();

    const bundleProducts = products.filter(
        (p) =>
            p.type === "bundle" &&
            Array.isArray(p.bundleItems) &&
            p.bundleItems.length > 0,
    );

    if (bundleProducts.length === 0) return result;

    const compIdsSet = new Set<string>();
    for (const bp of bundleProducts) {
        for (const bi of bp.bundleItems) {
            if (bi.productId) {
                compIdsSet.add(bi.productId.toString());
            }
        }
    }

    const compObjectIds = Array.from(compIdsSet).map(
        (id) => new Types.ObjectId(id),
    );
    const query = ProductModel.find({ _id: { $in: compObjectIds } }).select(
        "_id name",
    );
    if (session) {
        query.session(session);
    }
    const compDocs = await query.lean();
    const compNameMap = new Map<string, string>(
        compDocs.map((c: any) => [c._id.toString(), c.name]),
    );

    for (const bp of bundleProducts) {
        const bpId = (bp._id || bp.id).toString();
        const comps = bp.bundleItems.map((bi: any) => {
            const cIdStr = bi.productId.toString();
            return {
                productId: new Types.ObjectId(cIdStr),
                name: compNameMap.get(cIdStr) || "Producto componente",
                quantityPerBundle: Math.max(1, Number(bi.quantity) || 1),
            };
        });
        result.set(bpId, comps);
    }

    return result;
}

