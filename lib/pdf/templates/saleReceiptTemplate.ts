import type { SaleReceiptTemplateData } from "@/types/pdf/saleReceipt";

export function saleReceiptTemplate(data: SaleReceiptTemplateData) {
    const { business, customer, order, items, totals } = data;

    return `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 32px;
                    color: #111;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 24px;
                }

                .title {
                    font-size: 28px;
                    font-weight: bold;
                }

                .section {
                    margin-bottom: 24px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th, td {
                    border-bottom: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #f5f5f5;
                }

                .totals {
                    margin-top: 24px;
                    width: 300px;
                    margin-left: auto;
                }

                .totals-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .grand-total {
                    font-size: 20px;
                    font-weight: bold;
                }

                .footer {
                    margin-top: 40px;
                    font-size: 12px;
                    color: #666;
                }
            </style>
        </head>

        <body>
            <div class="header">
                <div>
                    <div class="title">
                        COMPROBANTE DE VENTA
                    </div>

                    <div>
                        Orden #${order.number}
                    </div>

                    <div>
                        ${order.date}
                    </div>
                </div>

                <div>
                    <strong>${business.name}</strong><br />
                    ${business.address}<br />
                    ${business.phone}<br />
                    ${business.email}
                </div>
            </div>

            <div class="section">
                <strong>Cliente</strong><br />

                ${customer.name}<br />
                ${customer.email || ""}<br />
                ${customer.phone || ""}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${items
                        .map(
                            (item) => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>$${item.price.toFixed(2)}</td>
                            <td>$${item.total.toFixed(2)}</td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>

            <div class="totals">
                <div class="totals-row">
                    <span>Subtotal</span>
                    <span>$${totals.subtotal.toFixed(2)}</span>
                </div>

                <div class="totals-row">
                    <span>Envío</span>
                    <span>$${totals.shipping.toFixed(2)}</span>
                </div>

                <div class="totals-row grand-total">
                    <span>Total</span>
                    <span>$${totals.total.toFixed(2)}</span>
                </div>
            </div>

            <div class="footer">
                Este comprobante no tiene validez fiscal.
            </div>
        </body>
        </html>
    `;
}
