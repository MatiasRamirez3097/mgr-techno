import { GET } from "../auth/route";

export async function POST(req: Request) {
    const auth = await GET(
        new Request("http://localhost/api/afip/auth?ws=ws_sr_padron_a10"),
    );
    const { token, sign } = await auth.json();
    console.log(">>>", token);
    const { cuit } = await req.json();
    console.log(cuit);
    const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://a10.soap.ws.server.puc.sr/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:getPersona>
      <token>${token}</token>
      <sign>${sign}</sign>
      <cuitRepresentada>20407045743</cuitRepresentada>
      <idPersona>20202020</idPersona>
    </ws:getPersona>
  </soapenv:Body>
</soapenv:Envelope>`;

    const res = await fetch(
        "https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA10",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml",
            },
            body: soap,
        },
    );

    const data = await res.text();

    return Response.json({ data });
}
