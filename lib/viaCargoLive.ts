//import { estimateViaCargo as estimateStaticViaCargo } from "./viaCargoEstimator";

interface ViaCargoLiveParams {
    destinationZipCode: string; // Código postal de destino
    actualWeight: number; // Peso en KG
    cartTotal: number; // Valor declarado
    dimensions?: {
        // Dimensiones opcionales
        length: number;
        width: number;
        height: number;
    };
}

export async function getLiveViaCargoQuote(params: ViaCargoLiveParams) {
    try {
        // ==========================================
        // 1. LLAMADA A LA API DE BUSPLUS / VÍA CARGO
        // ==========================================

        // Construimos el body usando el esquema oficial
        const adjustedDimensions = {
            length: 20,
            width: 20,
            height: 20,
        };
        if (
            params.dimensions &&
            params.dimensions?.length +
                params.dimensions?.height +
                params.dimensions?.width >=
                69600 &&
            params.dimensions?.length +
                params.dimensions?.height +
                params.dimensions?.width <
                91000
        ) {
            adjustedDimensions.length = 60;
            adjustedDimensions.width = 29;
            adjustedDimensions.height = 40;
        } else if (
            params.dimensions &&
            (params.dimensions?.length +
                params.dimensions?.height +
                params.dimensions?.width >
                91000 ||
                params.dimensions?.length +
                    params.dimensions?.height +
                    params.dimensions?.width <
                    69600)
        ) {
            adjustedDimensions.length = params.dimensions.length;
            adjustedDimensions.width = params.dimensions.width;
            adjustedDimensions.height = params.dimensions.height;
        }
        const payload = {
            IdClienteRemitente: "99999999", // ID de cotización pública
            IdCentroRemitente: "99",
            CodigoPostalRemitente: "2000", // Fijo: Rosario
            CodigoPostalDestinatario: params.destinationZipCode.toString(),
            ImporteValorDeclarado: Math.round(params.cartTotal).toString(),
            NumeroBultos: "1",
            Kilos: Math.max(1, Math.ceil(params.actualWeight)).toString(), // Redondeamos para arriba
            Largo: adjustedDimensions.length.toString(),
            Alto: adjustedDimensions.height.toString(),
            Ancho: adjustedDimensions.width.toString(),
            TipoPortes: "P", // Porte Pagado
        };

        const response = await fetch(
            "https://ws.busplus.com.ar/alerce/cotizar",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                // Timeout cortito (ej: 4 segundos) para evitar colgar el checkout
                signal: AbortSignal.timeout(4000),
            },
        );

        if (!response.ok) {
            throw new Error(`Busplus API error: ${response.status}`);
        }

        const data = await response.json();

        // ==========================================
        // 2. EXTRACCIÓN DE LA TARIFA
        // ==========================================
        if (
            !data.Cotizacion ||
            !Array.isArray(data.Cotizacion) ||
            data.Cotizacion.length === 0
        ) {
            throw new Error(
                "La API no devolvió opciones de cotización válidas.",
            );
        }

        // Buscamos "VIA CARGO ESTANDAR" (Código 2000) que es el envío a sucursal.
        // Si por algún motivo no existe, tomamos la opción más barata como fallback.
        console.log(data.Cotizacion);
        const standardOption = data.Cotizacion.find(
            (c: any) => c.PRODUCTO_CODIGO === "2000",
        );
        const cheapestOption = [...data.Cotizacion].sort(
            (a, b) => Number(a.TOTAL) - Number(b.TOTAL),
        )[0];

        const selectedOption = standardOption || cheapestOption;

        if (!selectedOption || !selectedOption.TOTAL) {
            throw new Error("No se pudo extraer el precio de la cotización.");
        }

        const livePrice = Number(selectedOption.TOTAL);

        // Formateamos la fecha (viene como "30/06/2026 00:00")
        let liveDays = "3 a 7 días hábiles";
        if (selectedOption.TIEMPO_ENTREGA) {
            const datePart = selectedOption.TIEMPO_ENTREGA.split(" ")[0]; // "30/06/2026"
            liveDays = `Llega aprox. el ${datePart}`;
        }

        return {
            success: true,
            source: "API_LIVE",
            cost:
                livePrice < 16000
                    ? livePrice + 1000 > 15999
                        ? 15999
                        : livePrice + 1000
                    : livePrice,
            estimatedDays: liveDays,
        };
    } catch (error) {
        console.warn(
            "Fallo el cotizador en vivo de Vía Cargo. Usando tabla de contingencia...",
            error,
        );

        // ==========================================
        // PLAN B: SI LA API FALLA, USAMOS LA TABLA ESTÁTICA
        // ==========================================
        // Acá podrías intentar inferir la provincia según el CP,
        // pero por defecto lo mandamos a la tabla con Buenos Aires.
        const fallbackProvince = "Buenos Aires";

        /*return estimateStaticViaCargo({
            destinationProvince: fallbackProvince,
            actualWeight: params.actualWeight,
            cartTotal: params.cartTotal,
            dimensions: params.dimensions,
        });*/
    }
}
