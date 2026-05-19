// /app/api/afip/padron/route.ts

import { mapPadronToSupplier } from "@/lib/mappers/supplierPadronMapper";

import { getAuth } from "@/lib/afip/auth/getAuth";

import { soapRequest } from "@/lib/afip/client";

const PADRON_URL =
    "https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5";

export async function POST(req: Request) {
    try {
        const { cuit } = await req.json();

        const { token, sign } = await getAuth("ws_sr_constancia_inscripcion");

        const { json, xml } = await soapRequest({
            url: PADRON_URL,

            operation: "getPersona_v2",

            body: `
                <a5:getPersona_v2
                    xmlns:a5="http://a5.soap.ws.server.puc.sr/"
                >
                    <token>
                        ${token}
                    </token>

                    <sign>
                        ${sign}
                    </sign>

                    <cuitRepresentada>
                        ${process.env.AFIP_CUIT}
                    </cuitRepresentada>

                    <idPersona>
                        ${cuit}
                    </idPersona>
                </a5:getPersona_v2>
            `,
        });

        const persona = json.Envelope.Body.getPersona_v2Response.personaReturn;

        const entity = mapPadronToSupplier(persona);

        return Response.json({
            success: true,

            entity,
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
