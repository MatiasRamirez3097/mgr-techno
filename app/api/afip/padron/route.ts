import { GET } from "../auth/route";
import { mapPadronToSupplier } from "@/lib/mappers/supplierPadronMapper";
import { parseStringPromise } from "xml2js";

export async function POST(req: Request) {
    const auth = await GET(
        new Request(
            "http://localhost/api/afip/auth?ws=ws_sr_constancia_inscripcion",
        ),
    );
    const { token, sign } = await auth.json();
    const { cuit } = await req.json();
    const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a5="http://a5.soap.ws.server.puc.sr/">
<soapenv:Header/>
<soapenv:Body>
<a5:getPersona_v2>
<token>${token}</token>
<sign>${sign}</sign>
<cuitRepresentada>20407045743</cuitRepresentada>
<idPersona>${cuit}</idPersona>
</a5:getPersona_v2>
</soapenv:Body>
</soapenv:Envelope>`;
    const res = await fetch(
        "https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml",
            },
            body: soap,
        },
    );

    const xml = await res.text();
    // 🔥 PARSEAMOS
    const json = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: true,
        tagNameProcessors: [
            (name) => name.replace(/^.*:/, ""), // 🔥 saca namespaces
        ],
    });

    // 🧠 navegar la respuesta de AFIP
    const persona = json.Envelope.Body.getPersona_v2Response.personaReturn;
    const supplier = mapPadronToSupplier(persona);
    return Response.json({
        success: true,
        supplier,
    });
}
