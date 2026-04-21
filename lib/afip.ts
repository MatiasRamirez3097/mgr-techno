import fs from "fs";
import { execFileSync } from "child_process";

const CERT = "certs/cert.crt";
const KEY = "certs/private.key";

function createTRA() {
    const now = new Date();
    const uniqueId = Date.now();

    const generationTime = new Date(now.getTime() - 60000)
        .toISOString()
        .replace(/\.\d{3}Z$/, "");
    const expirationTime = new Date(now.getTime() + 600000)
        .toISOString()
        .replace(/\.\d{3}Z$/, "");

    return `<?xml version="1.0" encoding="UTF-8"?>
  <loginTicketRequest version="1.0">
    <header>
      <uniqueId>${uniqueId}</uniqueId>
      <generationTime>${generationTime}</generationTime>
      <expirationTime>${expirationTime}</expirationTime>
    </header>
    <service>wsfe</service>
  </loginTicketRequest>`;
}

function signTRA(tra: string) {
    fs.writeFileSync("tra.xml", tra);

    execFileSync("openssl", [
        "smime",
        "-sign",
        "-signer",
        "certs/cert.crt",
        "-inkey",
        "certs/private.key",
        "-in",
        "tra.xml",
        "-out",
        "tra.tmp",
        "-outform",
        "DER",
        "-binary",
        "-noattr",
        "-md",
        "sha1",
    ]);

    const der = fs.readFileSync("tra.tmp");
    const cms = der.toString("base64");

    return cms.replace(/\n/g, "");
}

export async function getToken() {
    const tra = createTRA();
    const cms = signTRA(tra);

    const soap = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
    <soapenv:Header/>
    <soapenv:Body>
      <wsaa:loginCms>
        <wsaa:in0>${cms}</wsaa:in0>
      </wsaa:loginCms>
    </soapenv:Body>
  </soapenv:Envelope>
  `;

    const res = await fetch(
        "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "",
            },
            body: soap,
        },
    );

    const xml = await res.text();

    // parsing simple (después lo mejoramos)
    const token = xml.match(/<token>(.*?)<\/token>/)?.[1];
    const sign = xml.match(/<sign>(.*?)<\/sign>/)?.[1];

    if (!token || !sign) {
        console.error(xml);
        throw new Error("No se pudo obtener token de AFIP");
    }

    return { token, sign };
}
