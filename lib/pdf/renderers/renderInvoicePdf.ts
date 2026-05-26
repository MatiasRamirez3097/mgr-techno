import PDFDocument from "pdfkit";

import QRCode from "qrcode";

import { renderBaseDocument } from "./renderBaseDocument";

export async function renderInvoicePdf(data: any) {
    const doc = new PDFDocument({
        margin: 50,
    });

    /*
    |----------------------------------------------------------------------
    | AFIP LETTER
    |----------------------------------------------------------------------
    */

    doc.fontSize(40).text("B", 280, 40);

    /*
    |----------------------------------------------------------------------
    | BASE
    |----------------------------------------------------------------------
    */

    renderBaseDocument(doc, data);

    /*
    |----------------------------------------------------------------------
    | QR
    |----------------------------------------------------------------------
    */

    if (data.afip?.qrUrl) {
        const qrBuffer = await QRCode.toBuffer(data.afip.qrUrl);

        doc.image(qrBuffer, 50, 650, {
            width: 90,
        });
    }

    /*
    |----------------------------------------------------------------------
    | CAE
    |----------------------------------------------------------------------
    */

    doc.fontSize(10).text(`CAE: ${data.afip.cae}`, 170, 670);

    doc.text(`Vto. CAE: ${data.afip.caeExpiration}`, 170, 690);

    doc.end();

    return doc;
}
