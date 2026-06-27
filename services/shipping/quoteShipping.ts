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
    console.log("items>>>", items);
    const products = await getProductsByIds(items.map((item) => item.id));
    let res;
    if (shippingMethod === "andreani") {
        res = await cotizarAndreani(
            postcode,
            products.map((product) => {
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
        const itemsData = products.map((product) => {
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
    console.log(res);
    return res;
}
