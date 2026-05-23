// /lib/afip/auth/wsaa.ts
import forge from "node-forge";

import { parseStringPromise } from "xml2js";

import { decode } from "html-entities";

export async function callWSAA(cms: string) {
    const soap = `
        <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"
        >
            <soapenv:Header/>

            <soapenv:Body>
                <wsaa:loginCms>
                    <wsaa:in0>
                        ${cms}
                    </wsaa:in0>
                </wsaa:loginCms>
            </soapenv:Body>
        </soapenv:Envelope>
    `;

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

/*export function signTRA(xml: string): string {
    const tmpDir = os.tmpdir();

    const traPath = path.join(tmpDir, `tra_${Date.now()}.xml`);

    const derPath = path.join(tmpDir, `cms_${Date.now()}.der`);

    let certPath: string;

    let keyPath: string;
    try {
        if (process.env.AFIP_CERT_BASE64 && process.env.AFIP_KEY_BASE64) {
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
            throw new Error("No se encontraron los certificados");
        }

        fs.writeFileSync(traPath, xml, "utf8");

        execSync(
            `openssl smime -sign -signer "${certPath}" -inkey "${keyPath}" -in "${traPath}" -out "${derPath}" -outform DER -binary -noattr -nodetach -md sha1`,
        );

        const der = fs.readFileSync(derPath);

        return der.toString("base64");
    } finally {
        if (fs.existsSync(traPath)) {
            fs.unlinkSync(traPath);
        }

        if (fs.existsSync(derPath)) {
            fs.unlinkSync(derPath);
        }
    }
}*/

export function signTRA(xml: string): string {
    if (!process.env.AFIP_CERT_BASE64 || !process.env.AFIP_KEY_BASE64) {
        throw new Error("No se encontraron los certificados");
    }

    /*
    |----------------------------------------------------------------------
    | DECODE BASE64
    |----------------------------------------------------------------------
    */

    const certificate = Buffer.from(
        process.env.AFIP_CERT_BASE64,
        "base64",
    ).toString("utf8");

    const privateKey = Buffer.from(
        process.env.AFIP_KEY_BASE64,
        "base64",
    ).toString("utf8");

    /*
    |----------------------------------------------------------------------
    | VALIDATIONS
    |----------------------------------------------------------------------
    */

    if (!certificate.includes("BEGIN CERTIFICATE")) {
        throw new Error("AFIP certificate inválido");
    }

    if (!privateKey.includes("BEGIN")) {
        throw new Error("AFIP private key inválida");
    }

    /*
    |----------------------------------------------------------------------
    | PARSE PEM
    |----------------------------------------------------------------------
    */

    const cert = forge.pki.certificateFromPem(certificate);

    const key = forge.pki.privateKeyFromPem(privateKey);

    /*
    |----------------------------------------------------------------------
    | CREATE PKCS7
    |----------------------------------------------------------------------
    */

    const p7 = forge.pkcs7.createSignedData();

    p7.content = forge.util.createBuffer(xml, "utf8");

    p7.addCertificate(cert);

    p7.addSigner({
        key: key as any,

        certificate: cert,

        digestAlgorithm: forge.pki.oids.sha1,
    });

    /*
    |----------------------------------------------------------------------
    | SIGN
    |----------------------------------------------------------------------
    */

    p7.sign({
        detached: true,
    });

    /*
    |----------------------------------------------------------------------
    | DER → BASE64
    |----------------------------------------------------------------------
    */

    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();

    return forge.util.encode64(der);
}

export async function parseWSAAResponse(raw: string) {
    const parsed = await parseStringPromise(raw, {
        explicitArray: false,
    });

    const body = parsed["soapenv:Envelope"]["soapenv:Body"];

    if (body["soapenv:Fault"]) {
        const fault = body["soapenv:Fault"];

        throw new Error(`${fault.faultcode} - ${fault.faultstring}`);
    }

    const loginCmsReturn = body["loginCmsResponse"]["loginCmsReturn"];

    const unescaped = decode(loginCmsReturn);

    const inner = await parseStringPromise(unescaped, {
        explicitArray: false,
    });

    const credentials = inner["loginTicketResponse"]["credentials"];

    const header = inner["loginTicketResponse"]["header"];

    return {
        token: credentials.token,

        sign: credentials.sign,

        expirationTime: header.expirationTime,
    };
}
