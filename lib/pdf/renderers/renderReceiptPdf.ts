import PDFDocument from "pdfkit";

import { renderBaseDocument } from "./renderBaseDocument";

export async function renderReceiptPdf(data: any) {
    const doc = new PDFDocument({
        margin: 50,
    });

    renderBaseDocument(doc, data);

    /*
    |----------------------------------------------------------------------
    | FOOTER
    |----------------------------------------------------------------------
    */

    doc.fontSize(10).text("Comprobante no fiscal", 50, 740);

    doc.end();

    return doc;
}
