interface CartItem {
    weight: number;
    dimensions: { length: number; width: number; height: number };
    quantity: number;
}

interface AndreaniQuoteResult {
    total: number;
    error?: string;
}

function calcularVolumen(items: CartItem[]): number {
    // Volumen en cm³ → convertimos a dm³ (litros) que es lo que pide Andreani
    return items.reduce((acc, item) => {
        const volItem =
            (item.dimensions.length *
                item.dimensions.width *
                item.dimensions.height) /
            1000; // cm³ a dm³
        return acc + volItem * item.quantity;
    }, 0);
}

function calcularPeso(items: CartItem[]): number {
    return items.reduce((acc, item) => acc + item.weight * item.quantity, 0);
}

export async function cotizarAndreani(
    cpDestino: string,
    items: CartItem[],
): Promise<AndreaniQuoteResult> {
    try {
        const kilos = calcularPeso(items);
        const volumen = calcularVolumen(items);

        // Si no hay peso ni volumen cargado, usamos valores mínimos
        const kilosFinal = kilos > 0 ? kilos : 0.5;
        const volumenFinal = volumen > 0 ? volumen : 1;

        // Valor declarado = suma de precios (requerido por Andreani para el seguro)
        const valorDeclarado = items.reduce(
            (acc, item: any) => acc + (item.price || 0) * item.quantity,
            0,
        );

        const params = new URLSearchParams({
            cpDestino,
            contrato: process.env.ANDREANI_CONTRATO!,
            cliente: process.env.ANDREANI_CLIENTE!,
            "bultos[0][valorDeclarado]": Math.round(valorDeclarado).toString(),
            "bultos[0][volumen]": volumenFinal.toFixed(2),
            "bultos[0][kilos]": kilosFinal.toFixed(2),
        });

        const res = await fetch(
            `https://apis.andreani.com/v1/tarifas?${params.toString()}`,
            { cache: "no-store" },
        );

        if (!res.ok) {
            return { total: 0, error: "No se pudo cotizar el envío" };
        }

        const data = await res.json();
        const total = parseFloat(data?.tarifaConIva?.total || "0");

        return { total };
    } catch (e) {
        console.log(">>> error Andreani:", e);
        return { total: 0, error: "Error al conectar con Andreani" };
    }
}
