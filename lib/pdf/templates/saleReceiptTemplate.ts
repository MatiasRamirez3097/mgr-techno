import type { SaleReceiptTemplateData } from "@/types/pdf/saleReceipt";

export function saleReceiptTemplate(data: SaleReceiptTemplateData) {
    const { business, customer, order, items, totals } = data;

    return `
    <html>

    <head>

        <meta charset="UTF-8" />

        <style>

            * {
                box-sizing: border-box;
            }

            body {

                margin: 0;

                padding: 16px;

                font-family:
                    Arial,
                    sans-serif;

                background: #f3f4f6;

                color: #000;
            }

            .invoice {

                width: 100%;

                border:
                    2px solid #000;

                background: #fff;
            }

            /*
            |--------------------------------------------------------------------------
            | HEADER
            |--------------------------------------------------------------------------
            */

            .header {

                display: flex;

                border-bottom:
                    2px solid #000;
            }

            .header-left {

                width: 50%;

                padding: 14px;

                border-right:
                    2px solid #000;
            }

            .header-center {

                width: 80px;

                border-right:
                    2px solid #000;

                display: flex;

                flex-direction: column;

                justify-content: center;

                align-items: center;

                padding: 10px;
            }

            .voucher-letter {

                font-size: 44px;

                font-weight: bold;

                line-height: 1;
            }

            .voucher-code {

                font-size: 12px;

                margin-top: 8px;

                text-align: center;
            }

            .header-right {

                flex: 1;

                padding: 14px;

                text-align: right;
            }

            .business-name {

                font-size: 24px;

                font-weight: bold;

                margin-bottom: 6px;
            }

            .business-info {

                font-size: 11px;

                line-height: 1.5;
            }

            .invoice-title {

                font-size: 34px;

                font-weight: bold;
            }

            .invoice-number {

                font-size: 24px;

                margin-top: 6px;

                font-weight: bold;
            }

            .invoice-date {

                margin-top: 8px;

                font-size: 12px;
            }

            /*
            |--------------------------------------------------------------------------
            | BOXES
            |--------------------------------------------------------------------------
            */

            .box {

                border-bottom:
                    2px solid #000;

                padding: 10px 14px;
            }

            .row {

                display: flex;

                gap: 24px;

                margin-bottom: 6px;
            }

            .row:last-child {
                margin-bottom: 0;
            }

            .field {

                flex: 1;

                font-size: 12px;
            }

            .label {

                font-weight: bold;

                margin-right: 6px;
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

                padding: 8px;

                font-size: 12px;

                text-align: left;
            }

            td {

                border:
                    1px solid #000;

                padding: 8px;

                font-size: 12px;
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

                height: 380px;

                border-bottom:
                    2px solid #000;
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

                padding: 14px;
            }

            .footer-left {

                width: 260px;
            }

            .qr-placeholder {

                width: 100px;

                height: 100px;

                border:
                    2px solid #000;

                display: flex;

                align-items: center;

                justify-content: center;

                font-size: 10px;

                margin-bottom: 10px;
            }

            .cae {

                font-size: 12px;

                line-height: 1.6;
            }

            .totals {

                width: 280px;
            }

            .total-row {

                display: flex;

                justify-content: space-between;

                margin-bottom: 10px;

                font-size: 13px;
            }

            .grand-total {

                font-size: 24px;

                font-weight: bold;

                border-top:
                    2px solid #000;

                padding-top: 12px;

                margin-top: 12px;
            }

            .footer-note {

                border-top:
                    2px solid #000;

                text-align: center;

                padding: 8px;

                font-size: 11px;
            }

        </style>

    </head>

    <body>

        <div class="invoice">

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

                    <div class="invoice-title">
                        COMPROBANTE
                    </div>

                    <div class="invoice-number">
                        Nº ${order.number}
                    </div>

                    <div class="invoice-date">
                        FECHA: ${order.date}
                    </div>

                </div>

            </div>

            <!-- CUSTOMER -->

            <div class="box">

                <div class="row">

                    <div class="field">

                        <span class="label">
                            CLIENTE:
                        </span>

                        ${customer.name}

                    </div>

                    <div class="field">

                        <span class="label">
                            EMAIL:
                        </span>

                        ${customer.email || "-"}

                    </div>

                </div>

                <div class="row">

                    <div class="field">

                        <span class="label">
                            TEL:
                        </span>

                        ${customer.phone || "-"}

                    </div>

                    <div class="field">

                        <span class="label">
                            CONDICIÓN:
                        </span>

                        Consumidor Final

                    </div>

                </div>

            </div>

            <!-- TABLE -->

            <table>

                <thead>

                    <tr>

                        <th>
                            Descripción
                        </th>

                        <th width="90">
                            Cant.
                        </th>

                        <th width="120">
                            Precio Uni.
                        </th>

                        <th width="140">
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

            <!-- SPACER -->

            <div class="spacer"></div>

            <!-- FOOTER -->

            <div class="footer">

                <div class="footer-left">

                    <div class="qr-placeholder">
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

            <div class="footer-note">

                Este comprobante no posee validez fiscal.

            </div>

        </div>

    </body>

    </html>
    `;
}
