import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: string;

    feCAEReq: any;
}
const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

export async function createVoucher({ token, sign, cuit, feCAEReq }: Params) {
    const response = await soapRequest({
        url: WSFE_URL,
        operation: "FECAESolicitar",
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

    return {
        xml: response.xml,

        json: response.json.FECAESolicitarResponse.FECAESolicitarResult,
    };
}
