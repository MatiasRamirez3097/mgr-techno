import PDFDocument from "pdfkit";

export function renderBaseDocument(doc: PDFKit.PDFDocument, data: any) {
    /*
    |----------------------------------------------------------------------
    | HEADER
    |----------------------------------------------------------------------
    */

    doc.fontSize(22).text(data.business.name, 50, 50);

    doc.fontSize(10).text(data.business.address, 50, 80);

    doc.text(data.business.phone);

    doc.text(data.business.email);

    /*
    |----------------------------------------------------------------------
    | DOCUMENT INFO
    |----------------------------------------------------------------------
    */

    doc.fontSize(18).text(data.document.type, 400, 50);

    doc.fontSize(12).text(`N° ${data.document.number}`, 400, 80);

    doc.text(`Fecha: ${data.document.date}`, 400, 100);

    /*
    |----------------------------------------------------------------------
    | CUSTOMER
    |----------------------------------------------------------------------
    */

    doc.fontSize(14).text("Cliente", 50, 150);

    doc.fontSize(11).text(data.customer.name, 50, 175);

    if (data.customer.document) {
        doc.text(`Doc: ${data.customer.document}`);
    }

    if (data.customer.address) {
        doc.text(data.customer.address);
    }

    /*
    |----------------------------------------------------------------------
    | ITEMS
    |----------------------------------------------------------------------
    */

    let y = 260;

    doc.fontSize(12);

    doc.text("Producto", 50, y);

    doc.text("Cant.", 300, y);

    doc.text("Precio", 380, y);

    doc.text("Total", 480, y);

    y += 25;

    data.items.forEach((item: any) => {
        doc.text(item.name, 50, y);

        doc.text(String(item.quantity), 300, y);

        doc.text(`$ ${item.price.toFixed(2)}`, 380, y);

        doc.text(`$ ${item.total.toFixed(2)}`, 480, y);

        y += 22;
    });

    /*
    |----------------------------------------------------------------------
    | TOTALS
    |----------------------------------------------------------------------
    */

    y += 30;

    doc.fontSize(12);

    doc.text(`Subtotal: $ ${data.totals.subtotal.toFixed(2)}`, 380, y);

    y += 20;

    doc.text(`Envío: $ ${data.totals.shipping.toFixed(2)}`, 380, y);

    y += 20;

    doc.fontSize(16).text(`TOTAL: $ ${data.totals.total.toFixed(2)}`, 380, y);
}
