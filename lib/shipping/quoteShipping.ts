type ShippingItem = {
    weight: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    price: number;
    quantity: number;
};

interface QuoteShippingParams {
    postcode: string;
    items: ShippingItem[];
}

export async function quoteShipping({ postcode, items }: QuoteShippingParams) {
    const res = await fetch("/api/shipping", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            postcode,
            items,
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "No se pudo cotizar el envío");
    }

    return data;
}
