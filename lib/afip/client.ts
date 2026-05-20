// /lib/afip/client.ts

import { parseStringPromise } from "xml2js";
import https from "https";
import crypto from "crypto";

interface SoapRequestParams {
    url: string;
    operation: string;
    body: string;
    useLegacySSL?: boolean;
}

// Agente https nativo — SÍ respeta SSL_OP_LEGACY_SERVER_CONNECT
const legacyAgent = new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    ciphers: "DEFAULT:@SECLEVEL=0", // 👈 clave: baja el nivel de seguridad
    minVersion: "TLSv1",
});

function httpsPost(
    url: string,
    body: string,
    headers: Record<string, string>,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);

        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Length": Buffer.byteLength(body),
                },
                agent: legacyAgent,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
            },
        );

        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

export async function soapRequest({
    url,
    operation,
    body,
    useLegacySSL = false,
}: SoapRequestParams) {
    const soap = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Header/>
            <soapenv:Body>
                ${body}
            </soapenv:Body>
        </soapenv:Envelope>
    `;

    const headers = { "Content-Type": "text/xml; charset=utf-8" };

    const xml = useLegacySSL
        ? await httpsPost(url, soap, headers) // https nativo con agente legacy
        : await fetch(url, { method: "POST", headers, body: soap }).then((r) =>
              r.text(),
          );

    const json = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: true,
        tagNameProcessors: [(name) => name.replace(/^.*:/, "")],
    });

    return { xml, json };
}
