import type { SaleReceiptTemplateData } from "@/types/pdf/saleReceipt";

export function saleReceiptTemplate(data: SaleReceiptTemplateData) {
    const { business, customer, order, items, totals } = data;

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
            |--------------------------------------------------------------------------
            | HEADER
            |--------------------------------------------------------------------------
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
            |--------------------------------------------------------------------------
            | INFO BOXES
            |--------------------------------------------------------------------------
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
            |--------------------------------------------------------------------------
            | TABLE
            |--------------------------------------------------------------------------
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
            |--------------------------------------------------------------------------
            | SPACER
            |--------------------------------------------------------------------------
            */

            .spacer {

                height: 420px;

                border-bottom:
                    1px solid #000;
            }

            /*
            |--------------------------------------------------------------------------
            | FOOTER
            |--------------------------------------------------------------------------
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

            .qr {

                width: 90px;

                height: 90px;

                border:
                    1px solid #000;

                display: flex;

                align-items: center;

                justify-content: center;

                margin-bottom: 8px;

                font-size: 9px;
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
            |--------------------------------------------------------------------------
            | NOTE
            |--------------------------------------------------------------------------
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
                        ${business.name}
                    </div>

                    <div class="business-info">

                        ${business.address}<br />

                        ${business.phone}<br />

                        ${business.email}

                    </div>

                </div>

                <div class="header-center">

                    <div class="voucher-letter">
                        X
                    </div>

                    <div class="voucher-code">

                        Cod.<br />
                        999

                    </div>

                </div>

                <div class="header-right">

                    <div class="document-title">
                        Comprobante
                    </div>

                    <div class="document-number">
                        Nº ${order.number}
                    </div>

                    <div class="document-date">
                        FECHA: ${order.date}
                    </div>

                </div>

            </div>

            <!-- CUSTOMER -->

            <div class="info-box">

                <div class="info-row">

                    <div class="info-col">

                        <span class="label">
                            Cliente:
                        </span>

                        ${customer.name}

                    </div>

                    <div class="info-col">

                        <span class="label">
                            Email:
                        </span>

                        ${customer.email || "-"}

                    </div>

                </div>

                <div class="info-row">

                    <div class="info-col">

                        <span class="label">
                            Teléfono:
                        </span>

                        ${customer.phone || "-"}

                    </div>

                    <div class="info-col">

                        <span class="label">
                            Condición:
                        </span>

                        Consumidor Final

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

                    ${items
                        .map(
                            (item) => `
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

                    <div class="qr">
                        QR AFIP
                    </div>

                    <div class="cae">

                        CAE: 00000000000000
                        <br />

                        VTO: ${order.date}

                    </div>

                </div>

                <div class="totals">

                    <div class="total-row">

                        <span>
                            SUBTOTAL:
                        </span>

                        <span>
                            $${totals.subtotal.toLocaleString("es-AR")}
                        </span>

                    </div>

                    <div class="total-row">

                        <span>
                            ENVÍO:
                        </span>

                        <span>
                            $${totals.shipping.toLocaleString("es-AR")}
                        </span>

                    </div>

                    <div class="total-row grand-total">

                        <span>
                            TOTAL:
                        </span>

                        <span>
                            $${totals.total.toLocaleString("es-AR")}
                        </span>

                    </div>

                </div>

            </div>

            <div class="note">

                Este comprobante no posee validez fiscal.

            </div>

        </div>

    </body>

    </html>
    `;
}
