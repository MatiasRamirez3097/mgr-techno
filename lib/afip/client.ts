// /lib/afip/client.ts

import { parseStringPromise } from "xml2js";

interface SoapRequestParams {
    url: string;

    operation: string;

    body: string;
}

export async function soapRequest({ url, operation, body }: SoapRequestParams) {
    const soap = `
        <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        >
            <soapenv:Header/>

            <soapenv:Body>
                ${body}
            </soapenv:Body>
        </soapenv:Envelope>
    `;

    const res = await fetch(url, {
        method: "POST",

        headers: {
            "Content-Type": "text/xml;charset=UTF-8",

            SOAPAction: operation,
        },

        body: soap,
    });

    const xml = await res.text();

    const json = await parseStringPromise(xml, {
        explicitArray: false,

        ignoreAttrs: true,

        tagNameProcessors: [(name) => name.replace(/^.*:/, "")],
    });

    return {
        xml,
        json,
    };
}
