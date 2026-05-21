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
        operation: "FECompUltimoAutorizado",
        url: WSFE_URL,
        body: `
                <feCAEReq
                    xmlns=""http://ar.gov.afip.dif.FEV1/""
                >
                    <token>${token}</token>
                    <sign>${sign}</sign>

                    <cuitRepresentada>
                        ${process.env.AFIP_CUIT}
                    </cuitRepresentada>

                    <idPersona>
                        ${cuit}
                    </idPersona>
                </feCAEReq>
            `,
    });

    return Number(response?.json?.FECompUltimoAutorizadoResult.CbteNro);
}
