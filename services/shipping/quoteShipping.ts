import { getProductsByIds } from "@/services/products/getProductsByIds";
import { getFinalPrice } from "@/lib/pricing";
import { cotizarAndreani } from "@/lib/andreani";
import { getLiveViaCargoQuote } from "@/lib/viaCargoLive";

type ShippingItem = {
    id: string;
    quantity: number;
};

interface QuoteShippingParams {
    postcode: string;
    items: ShippingItem[];
    shippingMethod: string;
}

export async function quoteShipping({
    postcode,
    items,
    shippingMethod,
}: QuoteShippingParams) {
    const products = await getProductsByIds(items.map((item) => item.id));

    // Si algún producto es un combo sin peso propio cargado, calculamos su peso y dimensiones a partir de sus componentes
    const bundleCompIds = new Set<string>();
    for (const p of products) {
        if (
            p.type === "bundle" &&
            (!p.weight || p.weight <= 0) &&
            Array.isArray(p.bundleItems)
        ) {
            for (const bi of p.bundleItems) {
                if (bi.productId) {
                    bundleCompIds.add(bi.productId);
                }
            }
        }
    }

    const compMap = new Map<string, any>();
    if (bundleCompIds.size > 0) {
        const compProducts = await getProductsByIds(Array.from(bundleCompIds));
        for (const cp of compProducts) {
            compMap.set(cp.id, cp);
        }
    }

    const normalizedProducts = products.map((product) => {
        if (
            product.type === "bundle" &&
            (!product.weight || product.weight <= 0) &&
            Array.isArray(product.bundleItems)
        ) {
            let sumWeight = 0;
            let maxLength = 0;
            let maxWidth = 0;
            let sumHeight = 0;
            for (const bi of product.bundleItems) {
                const cp = compMap.get(bi.productId);
                const qty = Math.max(1, Number(bi.quantity) || 1);
                if (cp) {
                    sumWeight += (Number(cp.weight) || 0) * qty;
                    const l = Number(cp.dimensions?.length) || 0;
                    const w = Number(cp.dimensions?.width) || 0;
                    const h = Number(cp.dimensions?.height) || 0;
                    if (l > maxLength) maxLength = l;
                    if (w > maxWidth) maxWidth = w;
                    sumHeight += h * qty;
                }
            }
            return {
                ...product,
                weight: sumWeight > 0 ? sumWeight : product.weight || 1,
                dimensions:
                    maxLength > 0 || maxWidth > 0 || sumHeight > 0
                        ? {
                              length: maxLength || 20,
                              width: maxWidth || 20,
                              height: sumHeight || 20,
                          }
                        : product.dimensions,
            };
        }
        return product;
    });

    let res;
    if (shippingMethod === "andreani") {
        res = await cotizarAndreani(
            postcode,
            normalizedProducts.map((product) => {
                const item = items.find((item) => item.id === product.id);
                return {
                    weight: product.weight,
                    dimensions: product.dimensions,
                    price: getFinalPrice(product),
                    quantity: item?.quantity ?? 1,
                };
            }),
        );
    } else {
        // 1. Transformamos tus datos a los parámetros de la función
        const itemsData = normalizedProducts.map((product) => {
            const item = items.find((i) => i.id === product.id);
            return {
                weight: product.weight || 0,
                price: getFinalPrice(product),
                quantity: item?.quantity ?? 1,
                // Asumiendo que product.dimensions viene como { length, width, height }
                dimensions: product.dimensions || {
                    length: 20,
                    width: 20,
                    height: 20,
                },
            };
        });

        // 2. Sumamos todo para obtener los totales que pide ViaCargo
        const quoteParams = itemsData.reduce(
            (acc, current) => {
                const totalWeight = current.weight * current.quantity;
                const totalPrice = current.price * current.quantity;

                return {
                    destinationZipCode: postcode,
                    actualWeight: acc.actualWeight + totalWeight,
                    cartTotal: acc.cartTotal + totalPrice,
                    // Para las dimensiones, tomamos el promedio o el más grande.
                    // Vía Cargo suele necesitar las dimensiones de un bulto grande.
                    // Si son varios, podrías sumar los volúmenes.
                    dimensions: current.dimensions, // Simplificado: tomamos las del último item
                };
            },
            {
                destinationZipCode: postcode,
                actualWeight: 0,
                cartTotal: 0,
                dimensions: { length: 20, width: 20, height: 20 },
            },
        );
        const response = await getLiveViaCargoQuote(quoteParams);
        const cost = response?.cost ? response.cost : undefined;
        res = cost ? { total: cost } : "error";
    }
    return res;
}
