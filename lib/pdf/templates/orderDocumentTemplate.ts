import QRCode from "qrcode";

export async function orderDocumentTemplate(data: any) {
    let qrImage = "";

    /*
    |------------------------------------------------------------------
    | QR
    |------------------------------------------------------------------
    */

    if (data.document.qrData) {
        const base64 = Buffer.from(
            JSON.stringify(data.document.qrData),
        ).toString("base64");
        const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
        qrImage = await QRCode.toDataURL(qrUrl);
    }

    return `
    <html>

    <head>

        <meta charset="UTF-8" />

        <style>

            @page {
                size: A4;
                margin: 10mm;
            }

            * {
                box-sizing: border-box;
            }

            body {

                margin: 0;

                font-family:
                    Helvetica,
                    Arial,
                    sans-serif;

                font-size: 11px;

                color: #000;

                background: #fff;
            }

            .document {

                width: 100%;

                border:
                    1px solid #000;
            }

            /*
            |------------------------------------------------------------------
            | HEADER
            |------------------------------------------------------------------
            */

            .header {

                display: flex;

                border-bottom:
                    1px solid #000;
            }

            .header-left {

                width: 50%;

                padding: 10px;

                border-right:
                    1px solid #000;
            }

            .header-center {

                width: 70px;

                border-right:
                    1px solid #000;

                display: flex;

                flex-direction: column;

                justify-content: center;

                align-items: center;

                padding: 8px;
            }

            .voucher-letter {

                font-size: 34px;

                font-weight: bold;

                line-height: 1;
            }

            .voucher-code {

                font-size: 10px;

                margin-top: 4px;

                text-align: center;
            }

            .header-right {

                flex: 1;

                padding: 10px;

                text-align: right;
            }

            .business-name {

                font-size: 22px;

                font-weight: bold;

                margin-bottom: 6px;

                text-transform: uppercase;
            }

            .business-info {

                font-size: 10px;

                line-height: 1.45;
            }

            .document-title {

                font-size: 26px;

                font-weight: bold;

                text-transform: uppercase;
            }

            .document-number {

                margin-top: 4px;

                font-size: 20px;

                font-weight: bold;
            }

            .document-date {

                margin-top: 6px;

                font-size: 11px;
            }

            /*
            |------------------------------------------------------------------
            | INFO BOXES
            |------------------------------------------------------------------
            */

            .info-box {

                border-bottom:
                    1px solid #000;

                padding: 6px 8px;
            }

            .info-row {

                display: flex;

                gap: 16px;

                margin-bottom: 4px;
            }

            .info-row:last-child {
                margin-bottom: 0;
            }

            .info-col {

                flex: 1;
            }

            .label {

                font-weight: bold;

                text-transform: uppercase;
            }

            /*
            |------------------------------------------------------------------
            | TABLE
            |------------------------------------------------------------------
            */

            table {

                width: 100%;

                border-collapse: collapse;
            }

            thead {

                background: #efefef;
            }

            th {

                border:
                    1px solid #000;

                padding: 5px 6px;

                font-size: 10px;

                text-transform: uppercase;
            }

            td {

                border:
                    1px solid #000;

                padding: 5px 6px;

                font-size: 10px;
            }

            .text-right {

                text-align: right;
            }

            /*
            |------------------------------------------------------------------
            | SPACER
            |------------------------------------------------------------------
            */

            .spacer {

                height: 420px;

                border-bottom:
                    1px solid #000;
            }

            /*
            |------------------------------------------------------------------
            | FOOTER
            |------------------------------------------------------------------
            */

            .footer {

                display: flex;

                justify-content: space-between;

                align-items: flex-end;

                padding: 10px;
            }

            .footer-left {

                width: 220px;
            }

            .qr img {

                width: 90px;

                height: 90px;

                border:
                    1px solid #000;

                padding: 4px;

                background: #fff;

                margin-bottom: 8px;
            }

            .cae {

                font-size: 10px;

                line-height: 1.5;
            }

            .totals {

                width: 260px;
            }

            .total-row {

                display: flex;

                justify-content: space-between;

                margin-bottom: 6px;

                font-size: 11px;
            }

            .grand-total {

                margin-top: 8px;

                padding-top: 8px;

                border-top:
                    1px solid #000;

                font-size: 18px;

                font-weight: bold;
            }

            /*
            |------------------------------------------------------------------
            | NOTE
            |------------------------------------------------------------------
            */

            .note {

                border-top:
                    1px solid #000;

                text-align: center;

                padding: 6px;

                font-size: 10px;
            }

        </style>

    </head>

    <body>

        <div class="document">

            <!-- HEADER -->

            <div class="header">

                <div class="header-left">

                    <div class="business-name">
                        ${data.business.fantasyName}
                    </div>

                    <div class="business-info">
                        ${data.business.name || ""}
                        <br />
                        ${data.business.address || ""}
                        <br />

                        ${data.business.phone || ""}
                        <br />

                        ${data.business.email || ""}

                        ${
                            data.business.cuit
                                ? `
                                <br />
                                CUIT:
                                ${data.business.cuit}
                                `
                                : ""
                        }

                        ${
                            data.business.ivaCondition
                                ? `
                                <br />
                                IVA:
                                ${data.business.ivaCondition}
                                `
                                : ""
                        }

                    </div>

                </div>

                <div class="header-center">

                    <div class="voucher-letter">
                        ${
                            data.document.isFiscal
                                ? data.document.fiscalType
                                : "X"
                        }
                    </div>

                    <div class="voucher-code">

                        Cod.
                        <br />

                        ${data.document.afipVoucherType || "999"}

                    </div>

                </div>

                <div class="header-right">

                    <div class="document-title">
                        ${data.document.title}
                    </div>

                    <div class="document-number">
                        Nº ${data.document.number}
                    </div>

                    <div class="document-date">
                        FECHA:
                        ${data.document.date}
                    </div>

                    ${
                        data.document.pointOfSale
                            ? `
                            <div class="document-date">
                                PTO. VTA:
                                ${data.document.pointOfSale}
                            </div>
                            `
                            : ""
                    }

                </div>

            </div>

            <!-- CUSTOMER -->

            <div class="info-box">

                <div class="info-row">

                    <div class="info-col">

                        <span class="label">
                            Cliente:
                        </span>

                        ${data.customer.name}

                    </div>

                    <div class="info-col">

                        <span class="label">
                            Email:
                        </span>

                        ${data.customer.email || "-"}

                    </div>

                </div>

                <div class="info-row">

                    <div class="info-col">

                        <span class="label">
                            Documento:
                        </span>

                        ${data.customer.document || "-"}

                    </div>

                    <div class="info-col">

                        <span class="label">
                            Condición:
                        </span>

                        ${
                            data.customer.taxCondition?.label ||
                            "Consumidor Final"
                        }

                    </div>

                </div>

                <div class="info-row">

                    <div class="info-col">

                        <span class="label">
                            Dirección:
                        </span>

                        ${data.customer.address || "-"}

                    </div>

                    <div class="info-col">

                        <span class="label">
                            Teléfono:
                        </span>

                        ${data.customer.phone || "-"}

                    </div>

                </div>

            </div>

            <!-- PRODUCTS -->

            <table>

                <thead>

                    <tr>

                        <th>
                            Descripción
                        </th>

                        <th width="70">
                            Cant.
                        </th>

                        <th width="110">
                            Precio Uni.
                        </th>

                        <th width="130">
                            Sub Total
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${data.items
                        .map(
                            (item: any) => `
                                <tr>

                                    <td>
                                        ${item.name}
                                    </td>

                                    <td class="text-right">
                                        ${item.quantity}
                                    </td>

                                    <td class="text-right">
                                        $${item.price.toLocaleString("es-AR")}
                                    </td>

                                    <td class="text-right">
                                        $${item.total.toLocaleString("es-AR")}
                                    </td>

                                </tr>
                            `,
                        )
                        .join("")}

                </tbody>

            </table>

            <!-- EMPTY SPACE -->

            <div class="spacer"></div>

            <!-- FOOTER -->

            <div class="footer">

                <div class="footer-left">

                    ${
                        qrImage
                            ? `
                            <div class="qr">
                                <img src="${qrImage}" />
                            </div>
                            `
                            : ""
                    }

                    ${
                        data.document.cae
                            ? `
                            <div class="cae">

                                CAE:
                                ${data.document.cae}

                                <br />

                                VTO:
                                ${data.document.caeExpiration}

                            </div>
                            `
                            : `
                            <div class="cae">
                                Comprobante no fiscal
                            </div>
                            `
                    }

                </div>

                <div class="totals">

                    <div class="total-row">

                        <span>
                            SUBTOTAL:
                        </span>

                        <span>
                            $${data.totals.subtotal.toLocaleString("es-AR")}
                        </span>

                    </div>

                    ${
                        typeof data.totals.iva === "number"
                            ? `
                            <div class="total-row">

                                <span>
                                    IVA:
                                </span>

                                <span>
                                    $${data.totals.iva.toLocaleString("es-AR")}
                                </span>

                            </div>
                            `
                            : ""
                    }

                    ${
                        typeof data.totals.shipping === "number"
                            ? `
                            <div class="total-row">

                                <span>
                                    ENVÍO:
                                </span>

                                <span>
                                    $${data.totals.shipping.toLocaleString("es-AR")}
                                </span>

                            </div>
                            `
                            : ""
                    }

                    <div class="total-row grand-total">

                        <span>
                            TOTAL:
                        </span>

                        <span>
                            $${data.totals.total.toLocaleString("es-AR")}
                        </span>

                    </div>

                </div>

            </div>

            <div class="note">

                ${
                    data.document.isFiscal
                        ? "Comprobante autorizado por AFIP."
                        : "Este comprobante no posee validez fiscal."
                }

            </div>

        </div>

    </body>

    </html>
    `;
}
