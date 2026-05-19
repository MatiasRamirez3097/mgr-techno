// /lib/afip/adapters/buildQrData.ts

export function buildQrData(invoice: any) {
    const data = {
        ver: 1,

        fecha: new Date().toISOString().slice(0, 10),

        cuit: Number(process.env.AFIP_CUIT),

        ptoVta: invoice.afip.pointOfSale,

        tipoCmp: invoice.afip.voucherType,

        nroCmp: invoice.afip.voucherNumber,

        importe: invoice.total,

        moneda: "PES",

        ctz: 1,

        tipoDocRec: invoice.customer.documentType,

        nroDocRec: Number(invoice.customer.documentNumber),

        tipoCodAut: "E",

        codAut: invoice.afip.cae,
    };

    return Buffer.from(JSON.stringify(data)).toString("base64");
}
