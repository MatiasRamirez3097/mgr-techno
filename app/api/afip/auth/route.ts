import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs, { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import os from "os";
import { parseStringPromise } from "xml2js";
import { decode } from "html-entities";

interface TicketAcceso {
    token: string;
    sign: string;
    expirationTime: string;
}

export function getCachedTA(ws: string): TicketAcceso | null {
    if (!existsSync(`./tmp/afip_${ws}.json`)) return null;

    const cached = JSON.parse(readFileSync(`./tmp/afip_${ws}.json`, "utf8"));
    const expiration = new Date(cached.expirationTime);

    // Renovar 5 minutos antes de que expire
    if (new Date() < new Date(expiration.getTime() - 5 * 60 * 1000)) {
        return cached;
    }

    return null;
}

export function saveTA(ws: string, ta: TicketAcceso) {
    writeFileSync(`./tmp/afip_${ws}.json`, JSON.stringify(ta), "utf8");
}

async function parseWSAAResponse(raw: string) {
    const parsed = await parseStringPromise(raw, { explicitArray: false });
    const body = parsed["soapenv:Envelope"]["soapenv:Body"];
    // Verificar si hay fault
    if (body["soapenv:Fault"]) {
        const fault = body["soapenv:Fault"];
        const code =
            typeof fault.faultcode === "object"
                ? (fault.faultcode._ ?? JSON.stringify(fault.faultcode))
                : fault.faultcode;
        throw new Error(`AFIP Error: ${code} - ${fault.faultstring}`);
    }
    // 2. Extraer el string escapado y desescaparlo
    const loginCmsReturn = body["loginCmsResponse"]["loginCmsReturn"];
    const unescaped = decode(loginCmsReturn); // &lt; → <, &gt; → >, etc.
    // 3. Parsear el XML interno
    const inner = await parseStringPromise(unescaped, { explicitArray: false });
    const credentials = inner["loginTicketResponse"]["credentials"];
    const header = inner["loginTicketResponse"]["header"];

    return {
        token: credentials["token"],
        sign: credentials["sign"],
        expirationTime: header["expirationTime"],
    };
}

function formatAfipDate(d: Date): string {
    // Convertir a hora Argentina (UTC-3) correctamente
    const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return ar.toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

function createTRA(ws: string) {
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
  <service>${ws}</service>
</loginTicketRequest>`;
}

function signTRA(xml: string): string {
    const tmpDir = os.tmpdir();
    const traPath = path.join(tmpDir, `tra_${Date.now()}.xml`);
    const derPath = path.join(tmpDir, `cms_${Date.now()}.der`);

    // Leer desde archivo (local) o desde env (Vercel)
    let certPath: string;
    let keyPath: string;

    if (process.env.AFIP_CERT_BASE64 && process.env.AFIP_KEY_BASE64) {
        // Escribir temporalmente desde env
        certPath = path.join(tmpDir, "afip_cert.crt");
        keyPath = path.join(tmpDir, "afip_key.pem");
        fs.writeFileSync(
            certPath,
            Buffer.from(process.env.AFIP_CERT_BASE64, "base64"),
        );
        fs.writeFileSync(
            keyPath,
            Buffer.from(process.env.AFIP_KEY_BASE64, "base64"),
        );
    } else {
        certPath = path.resolve("certs/certificate.crt");
        keyPath = path.resolve("certs/private.key");
    }

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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ws = searchParams.get("ws") ?? "wsfe";

        let ta = getCachedTA(ws);

        if (!ta) {
            const tra = createTRA(ws);
            const cms = signTRA(tra);
            const raw = await callWSAA(cms);
            const ta = await parseWSAAResponse(raw);
            saveTA(ws, ta);
        }

        return NextResponse.json({ success: true, ...ta });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}

export async function callWSAA(cms: string) {
    const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
    const response = await fetch(
        "https://wsaa.afip.gov.ar/ws/services/LoginCms",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "http://wsaa.afip.gov.ar/ws/services/LoginCms",
            },
            body: soap,
        },
    );
    return response.text();
}
