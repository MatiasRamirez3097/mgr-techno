import { getProductsByIds } from "@/services/products/getProductsByIds";
import { getFinalPrice } from "../pricing";

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

    const res = await fetch("/api/shipping", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            postcode,
            items: products.map((item) => {
                return {
                    weight: item.weight,
                    dimensions: item.dimensions,
                    price: getFinalPrice(item),
                };
            }),
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "No se pudo cotizar el envío");
    }

    return data;
}
