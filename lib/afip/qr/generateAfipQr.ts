interface GenerateAfipQrParams {
    cuit: number;

    pointOfSale: number;

    voucherType: number;

    voucherNumber: number;

    total: number;

    documentType: number;

    documentNumber: number;

    cae: string;

    date: string;
}

export function generateAfipQr({
    cuit,
    pointOfSale,
    voucherType,
    voucherNumber,
    total,
    documentType,
    documentNumber,
    cae,
    date,
}: GenerateAfipQrParams) {
    const payload = {
        ver: 1,

        fecha: date,

        cuit,

        ptoVta: pointOfSale,

        tipoCmp: voucherType,

        nroCmp: voucherNumber,

        importe: total,

        moneda: "PES",

        ctz: 1,

        tipoDocRec: documentType,

        nroDocRec: documentNumber,

        tipoCodAut: "E",

        codAut: Number(cae),
    };

    const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");

    const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;

    return {
        qrPayload: payload,

        qrUrl,
    };
}
