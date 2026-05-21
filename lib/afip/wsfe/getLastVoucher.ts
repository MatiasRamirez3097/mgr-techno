import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: string;

    pointOfSale: number;

    voucherType: number;
}

const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

export async function getLastVoucher({
    token,
    sign,
    cuit,
    pointOfSale,
    voucherType,
}: Params) {
    const response = await soapRequest({
        url: WSFE_URL,
        xmlns: "http://ar.gov.afip.dif.FEV1/",
        operation: "FECompUltimoAutorizado",
        useLegacySSL: true,
        body: {
            auth: {
                token: token,
                sign: sign,
                cuit: process.env.AFIP_CUIT,
            },
            payload: `<PtoVta>${pointOfSale}</PtoVta>
                <CbteTipo>${voucherType}</CbteTipo>`,
        },
    });

    return Number(
        response?.json?.Envelope?.Body?.FECompUltimoAutorizadoResponse
            ?.FECompUltimoAutorizadoResult?.CbteNro || "-1",
    );
}
