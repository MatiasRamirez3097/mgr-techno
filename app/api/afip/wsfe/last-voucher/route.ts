// /app/api/afip/wsfe/last-voucher/route.ts

import { getAuth } from "@/lib/afip/auth/getAuth";

import { soapRequest } from "@/lib/afip/client";

//const WSFE_URL =
//    process.env.AFIP_ENV === "production"
//        ? "https://servicios1.afip.gov.ar/wsfev1/service.asmx"
//        : "https://wswhomo.afip.gov.ar/wsfev1/service.asmx";
const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

export async function GET() {
    try {
        const { token, sign } = await getAuth("wsfe");

        const { json, xml } = await soapRequest({
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
                payload: `<PtoVta>5</PtoVta>
                <CbteTipo>6</CbteTipo>`,
            },
        });

        const result =
            json.Envelope.Body.FECompUltimoAutorizadoResponse
                .FECompUltimoAutorizadoResult;

        return Response.json({
            success: true,

            result,
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,

                error: error.message,
            },
            {
                status: 500,
            },
        );
    }
}
