import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs, { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import os from "os";
import { parseStringPromise } from "xml2js";

const CACHE_FILE = "/tmp/afip_ta.json";

interface TicketAcceso {
    token: string;
    sign: string;
    expirationTime: string;
}

export function getCachedTA(): TicketAcceso | null {
    if (!existsSync(CACHE_FILE)) return null;

    const cached = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    const expiration = new Date(cached.expirationTime);

    // Renovar 5 minutos antes de que expire
    if (new Date() < new Date(expiration.getTime() - 5 * 60 * 1000)) {
        return cached;
    }

    return null;
}

export function saveTA(ta: TicketAcceso) {
    writeFileSync(CACHE_FILE, JSON.stringify(ta), "utf8");
}

async function parseWSAAResponse(raw: string) {
    const parsed = await parseStringPromise(raw, { explicitArray: false });
    const body = parsed["soapenv:Envelope"]["soapenv:Body"];

    // Verificar si hay fault
    if (body["soapenv:Fault"]) {
        const fault = body["soapenv:Fault"];
        throw new Error(
            `AFIP Error: ${fault.faultcode} - ${fault.faultstring}`,
        );
    }

    const response =
        body["loginCmsReturn"] ??
        body["ns1:loginCmsResponse"]?.["ns1:loginCmsReturn"];

    // El contenido es XML adentro de XML, hay que parsearlo de nuevo
    const inner = await parseStringPromise(response, { explicitArray: false });
    const credentials = inner["loginTicketResponse"]["credentials"];

    return {
        token: credentials["token"],
        sign: credentials["sign"],
        expirationTime:
            inner["loginTicketResponse"]["header"]["expirationTime"],
    };
}

function formatAfipDate(d: Date): string {
    // Convertir a hora Argentina (UTC-3) correctamente
    const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return ar.toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

function createTRA() {
    const now = new Date();
    const uniqueId = Math.floor(Date.now() / 1000);

    const generationTime = formatAfipDate(new Date(now.getTime() - 60000));
    const expirationTime = formatAfipDate(new Date(now.getTime() + 600000));

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

function signTRA(xml: string): string {
    const tmpDir = os.tmpdir();
    const traPath = path.join(tmpDir, `tra_${Date.now()}.xml`);
    const derPath = path.join(tmpDir, `cms_${Date.now()}.der`);

    const certPath = path.resolve("certs/certificate.crt");
    const keyPath = path.resolve("certs/private.key");

    try {
        fs.writeFileSync(traPath, xml, "utf8");

        // Replica exactamente tu comando que funciona
        execSync(
            `openssl smime -sign -signer "${certPath}" -inkey "${keyPath}" ` +
                `-in "${traPath}" -out "${derPath}" ` +
                `-outform DER -binary -noattr -nodetach -md sha1`,
            { stdio: "pipe" },
        );

        const der = fs.readFileSync(derPath);
        return der.toString("base64");
    } finally {
        // Limpieza de archivos temporales
        if (fs.existsSync(traPath)) fs.unlinkSync(traPath);
        if (fs.existsSync(derPath)) fs.unlinkSync(derPath);
    }
}

export async function GET() {
    try {
        let ta = getCachedTA();

        if (!ta) {
            const tra = createTRA();
            const cms = signTRA(tra);
            const raw = await callWSAA(cms);
            const ta = await parseWSAAResponse(raw);
            saveTA(ta);
        }

        return NextResponse.json({ success: true, ...ta });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}

export async function callWSAA(cms) {
    const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
    const response = await fetch(
        "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "http://wsaahomo.afip.gov.ar/ws/services/LoginCms",
            },
            body: soap,
        },
    );
    return response.text();
}
