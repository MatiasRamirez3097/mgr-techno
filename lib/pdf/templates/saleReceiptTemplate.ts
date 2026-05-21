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

                    padding: 40px;

                    background: #f4f4f5;

                    font-family:
                        Arial,
                        sans-serif;

                    color: #18181b;
                }

                .page {

                    background: white;

                    border-radius: 24px;

                    overflow: hidden;

                    box-shadow:
                        0 10px 40px rgba(0,0,0,.08);
                }

                /*
                |--------------------------------------------------------------------------
                | HEADER
                |--------------------------------------------------------------------------
                */

                .header {

                    background:
                        linear-gradient(
                            135deg,
                            #111827,
                            #1f2937
                        );

                    color: white;

                    padding: 40px;
                }

                .header-top {

                    display: flex;

                    justify-content: space-between;

                    align-items: flex-start;
                }

                .brand {

                    font-size: 34px;

                    font-weight: 800;

                    letter-spacing: 1px;
                }

                .document-label {

                    margin-top: 8px;

                    font-size: 13px;

                    letter-spacing: 1px;

                    text-transform: uppercase;

                    opacity: .8;
                }

                .order-box {

                    text-align: right;
                }

                .order-number {

                    font-size: 28px;

                    font-weight: bold;
                }

                .order-date {

                    margin-top: 8px;

                    font-size: 14px;

                    opacity: .8;
                }

                .business-info {

                    margin-top: 24px;

                    font-size: 13px;

                    line-height: 1.7;

                    opacity: .9;
                }

                /*
                |--------------------------------------------------------------------------
                | CONTENT
                |--------------------------------------------------------------------------
                */

                .content {

                    padding: 40px;
                }

                .section {

                    margin-bottom: 36px;
                }

                .section-title {

                    font-size: 12px;

                    text-transform: uppercase;

                    letter-spacing: 1px;

                    color: #71717a;

                    margin-bottom: 14px;

                    font-weight: bold;
                }

                /*
                |--------------------------------------------------------------------------
                | CUSTOMER
                |--------------------------------------------------------------------------
                */

                .customer-card {

                    background: #fafafa;

                    border:
                        1px solid #e5e7eb;

                    border-radius: 18px;

                    padding: 22px;
                }

                .customer-name {

                    font-size: 18px;

                    font-weight: bold;

                    margin-bottom: 10px;
                }

                .customer-line {

                    color: #52525b;

                    font-size: 14px;

                    margin-bottom: 5px;
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

                thead th {

                    text-align: left;

                    font-size: 12px;

                    text-transform: uppercase;

                    letter-spacing: .5px;

                    color: #71717a;

                    padding-bottom: 14px;

                    border-bottom:
                        1px solid #e5e7eb;
                }

                tbody td {

                    padding: 18px 0;

                    border-bottom:
                        1px solid #f1f5f9;

                    font-size: 14px;
                }

                .product-name {

                    font-weight: 600;
                }

                .price {

                    text-align: right;
                }

                /*
                |--------------------------------------------------------------------------
                | TOTALS
                |--------------------------------------------------------------------------
                */

                .totals-wrapper {

                    display: flex;

                    justify-content: flex-end;

                    margin-top: 32px;
                }

                .totals {

                    width: 340px;

                    background: #fafafa;

                    border:
                        1px solid #e5e7eb;

                    border-radius: 18px;

                    padding: 24px;
                }

                .totals-row {

                    display: flex;

                    justify-content: space-between;

                    margin-bottom: 14px;

                    font-size: 14px;
                }

                .grand-total {

                    border-top:
                        1px solid #d4d4d8;

                    margin-top: 18px;

                    padding-top: 18px;

                    font-size: 22px;

                    font-weight: bold;
                }

                /*
                |--------------------------------------------------------------------------
                | FOOTER
                |--------------------------------------------------------------------------
                */

                .footer {

                    margin-top: 48px;

                    padding-top: 24px;

                    border-top:
                        1px solid #e5e7eb;

                    text-align: center;

                    font-size: 12px;

                    color: #71717a;

                    line-height: 1.8;
                }

            </style>

        </head>

        <body>

            <div class="page">

                <div class="header">

                    <div class="header-top">

                        <div>

                            <div class="brand">
                                ${business.name}
                            </div>

                            <div class="document-label">
                                Comprobante de venta
                            </div>

                        </div>

                        <div class="order-box">

                            <div class="order-number">
                                #${order.number}
                            </div>

                            <div class="order-date">
                                ${order.date}
                            </div>

                        </div>

                    </div>

                    <div class="business-info">

                        ${business.address}<br />

                        ${business.phone}<br />

                        ${business.email}

                    </div>

                </div>

                <div class="content">

                    <div class="section">

                        <div class="section-title">
                            Cliente
                        </div>

                        <div class="customer-card">

                            <div class="customer-name">
                                ${customer.name}
                            </div>

                            ${
                                customer.email
                                    ? `
                                        <div class="customer-line">
                                            ${customer.email}
                                        </div>
                                    `
                                    : ""
                            }

                            ${
                                customer.phone
                                    ? `
                                        <div class="customer-line">
                                            ${customer.phone}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                    <div class="section">

                        <div class="section-title">
                            Productos
                        </div>

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Producto
                                    </th>

                                    <th>
                                        Cantidad
                                    </th>

                                    <th class="price">
                                        Unitario
                                    </th>

                                    <th class="price">
                                        Total
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                ${items
                                    .map(
                                        (item) => `
                                            <tr>

                                                <td>
                                                    <div class="product-name">
                                                        ${item.name}
                                                    </div>
                                                </td>

                                                <td>
                                                    ${item.quantity}
                                                </td>

                                                <td class="price">
                                                    $${item.price.toLocaleString("es-AR")}
                                                </td>

                                                <td class="price">
                                                    $${item.total.toLocaleString("es-AR")}
                                                </td>

                                            </tr>
                                        `,
                                    )
                                    .join("")}

                            </tbody>

                        </table>

                        <div class="totals-wrapper">

                            <div class="totals">

                                <div class="totals-row">

                                    <span>
                                        Subtotal
                                    </span>

                                    <span>
                                        $${totals.subtotal.toLocaleString("es-AR")}
                                    </span>

                                </div>

                                <div class="totals-row">

                                    <span>
                                        Envío
                                    </span>

                                    <span>
                                        $${totals.shipping.toLocaleString("es-AR")}
                                    </span>

                                </div>

                                <div class="totals-row grand-total">

                                    <span>
                                        Total
                                    </span>

                                    <span>
                                        $${totals.total.toLocaleString("es-AR")}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                    <div class="footer">

                        Este comprobante no posee validez fiscal.
                        <br />
                        ${business.name}

                    </div>

                </div>

            </div>

        </body>

        </html>
    `;
}
