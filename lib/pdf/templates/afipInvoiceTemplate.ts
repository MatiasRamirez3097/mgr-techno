import type { AfipInvoiceTemplateData } from "@/types/pdf/afipInvoice";

export function afipInvoiceTemplate(data: AfipInvoiceTemplateData) {
    const { business, customer, invoice, items, totals, afip } = data;

    return `
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #111;
                font-size: 14px;
            }

            .top {
                display: flex;
                border: 1px solid #000;
                margin-bottom: 20px;
            }

            .left {
                width: 45%;
                padding: 16px;
                border-right: 1px solid #000;
            }

            .center {
                width: 10%;
                text-align: center;
                padding-top: 24px;
                font-size: 40px;
                font-weight: bold;
            }

            .right {
                width: 45%;
                padding: 16px;
            }

            .invoice-title {
                font-size: 28px;
                font-weight: bold;
            }

            .section {
                margin-bottom: 20px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
            }

            th, td {
                border: 1px solid #ccc;
                padding: 8px;
            }

            th {
                background: #eee;
            }

            .totals {
                width: 300px;
                margin-left: auto;
                margin-top: 20px;
            }

            .totals-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .qr {
                margin-top: 24px;
            }

            .footer {
                margin-top: 24px;
                font-size: 12px;
            }
        </style>
    </head>

    <body>

        <div class="top">

            <div class="left">
                <div class="invoice-title">
                    FACTURA ${invoice.letter}
                </div>

                <div>
                    ${business.name}
                </div>

                <div>
                    CUIT: ${business.cuit}
                </div>

                <div>
                    ${business.address}
                </div>

                <div>
                    IVA: ${business.ivaCondition}
                </div>
            </div>

            <div class="center">
                ${invoice.letter}
            </div>

            <div class="right">
                <div>
                    <strong>Punto de Venta:</strong>
                    ${invoice.pointOfSale}
                </div>

                <div>
                    <strong>Comp. Nro:</strong>
                    ${invoice.number}
                </div>

                <div>
                    <strong>Fecha:</strong>
                    ${invoice.date}
                </div>

                <div>
                    <strong>CAE:</strong>
                    ${afip.cae}
                </div>

                <div>
                    <strong>Vto. CAE:</strong>
                    ${afip.caeExpiration}
                </div>
            </div>

        </div>

        <div class="section">
            <strong>Cliente</strong><br />

            ${customer.name}<br />
            CUIT/DNI: ${customer.document}<br />
            Condición IVA: ${customer.ivaCondition}<br />
            ${customer.address || ""}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th>Cant.</th>
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
                <span>IVA</span>
                <span>$${totals.iva.toFixed(2)}</span>
            </div>

            <div class="totals-row">
                <strong>Total</strong>
                <strong>$${totals.total.toFixed(2)}</strong>
            </div>
        </div>

        <div class="qr">
            <img
                src="${afip.qrImage}"
                width="120"
                height="120"
            />
        </div>

        <div class="footer">
            Comprobante autorizado por AFIP.
        </div>

    </body>
    </html>
    `;
}
