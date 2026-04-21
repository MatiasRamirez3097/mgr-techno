export async function POST(req: Request) {
    const { cuit } = await req.json();

    const token = "TU_TOKEN";
    const sign = "TU_SIGN";

    const soap = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws_sr_padron_a5.afip.gov.ar">
    <soapenv:Header/>
    <soapenv:Body>
      <ws:getPersona>
        <token>${token}</token>
        <sign>${sign}</sign>
        <cuitRepresentada>TU_CUIT</cuitRepresentada>
        <idPersona>${cuit}</idPersona>
      </ws:getPersona>
    </soapenv:Body>
  </soapenv:Envelope>
  `;

    const res = await fetch(
        "https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5",
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
