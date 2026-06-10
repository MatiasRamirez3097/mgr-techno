import { getProductsByIds } from "@/services/products/getProductsByIds";
import { getFinalPrice } from "@/lib/pricing";
import { cotizarAndreani } from "@/lib/andreani";

type ShippingItem = {
    id: string;
    quantity: number;
};

interface QuoteShippingParams {
    postcode: string;
    items: ShippingItem[];
}

export async function quoteShipping({ postcode, items }: QuoteShippingParams) {
    const products = await getProductsByIds(items.map((item) => item.id));

    const res = await cotizarAndreani(
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

    return res;
}
