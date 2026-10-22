import type { QuoteDTO } from "@/types/shared/quote";

export function quoteDocumentTemplate(quote: QuoteDTO): string {
    const formattedDate = new Date(quote.date).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const formattedExpiration = new Date(quote.expirationDate).toLocaleDateString(
        "es-AR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        },
    );

    const isExpired = new Date(quote.expirationDate).getTime() < Date.now();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: quote.currency === "USD" ? "USD" : "ARS",
        }).format(val);
    };

    const customerAddress = [
        quote.customer?.address?.street,
        quote.customer?.address?.number,
        quote.customer?.address?.city,
        quote.customer?.address?.state,
    ]
        .filter(Boolean)
        .join(" ");

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <title>Presupuesto ${quote.number}</title>
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 11px;
                color: #111827;
                background: #ffffff;
            }
            .document {
                width: 100%;
                border: 1px solid #111827;
            }
            /* HEADER */
            .header {
                display: flex;
                border-bottom: 1px solid #111827;
            }
            .header-left {
                width: 48%;
                padding: 12px;
                border-right: 1px solid #111827;
            }
            .header-center {
                width: 76px;
                border-right: 1px solid #111827;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 8px;
                background: #fafafa;
            }
            .voucher-letter {
                font-size: 38px;
                font-weight: 900;
                line-height: 1;
                color: #0f172a;
            }
            .voucher-sub {
                font-size: 9px;
                font-weight: 700;
                margin-top: 4px;
                text-align: center;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .header-right {
                flex: 1;
                padding: 12px;
                text-align: right;
            }
            .business-name {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 4px;
                letter-spacing: -0.5px;
            }
            .business-tagline {
                font-size: 10px;
                color: #64748b;
                margin-bottom: 6px;
                font-weight: 500;
            }
            .business-info {
                font-size: 10px;
                line-height: 1.45;
                color: #334155;
            }
            .document-title {
                font-size: 22px;
                font-weight: 900;
                letter-spacing: 0.5px;
                color: #0284c7;
                text-transform: uppercase;
            }
            .document-number {
                margin-top: 3px;
                font-size: 16px;
                font-weight: 700;
                font-family: monospace;
                color: #0f172a;
            }
            .document-date {
                margin-top: 6px;
                font-size: 11px;
                color: #334155;
            }
            .expiration-badge {
                display: inline-block;
                margin-top: 6px;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                background: ${isExpired ? "#fee2e2" : "#fef3c7"};
                color: ${isExpired ? "#991b1b" : "#92400e"};
                border: 1px solid ${isExpired ? "#f87171" : "#fcd34d"};
            }

            /* CUSTOMER INFO */
            .info-box {
                border-bottom: 1px solid #111827;
                padding: 10px 12px;
                background: #f8fafc;
            }
            .info-row {
                display: flex;
                gap: 20px;
                margin-bottom: 4px;
            }
            .info-row:last-child {
                margin-bottom: 0;
            }
            .info-col {
                flex: 1;
            }
            .label {
                font-weight: 700;
                color: #475569;
                font-size: 10px;
                text-transform: uppercase;
                margin-right: 4px;
            }
            .value {
                color: #0f172a;
                font-weight: 600;
            }

            /* ITEMS TABLE */
            table {
                width: 100%;
                border-collapse: collapse;
            }
            thead {
                background: #f1f5f9;
            }
            th {
                border-bottom: 1px solid #111827;
                border-right: 1px solid #cbd5e1;
                padding: 8px 10px;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                color: #334155;
            }
            th:last-child {
                border-right: none;
            }
            td {
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #f1f5f9;
                padding: 7px 10px;
                font-size: 10px;
            }
            td:last-child {
                border-right: none;
            }
            tr:nth-child(even) {
                background: #fafafa;
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .origin-badge {
                display: inline-block;
                padding: 1px 4px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: 700;
                text-transform: uppercase;
                margin-right: 4px;
                background: #e2e8f0;
                color: #475569;
            }

            /* FOOTER / TOTALS */
            .footer {
                display: flex;
                border-bottom: 1px solid #111827;
            }
            .footer-notes {
                flex: 1;
                padding: 12px;
                border-right: 1px solid #111827;
                font-size: 10px;
                line-height: 1.5;
                color: #334155;
            }
            .footer-notes strong {
                color: #0f172a;
            }
            .footer-totals {
                width: 250px;
                padding: 10px 14px;
                background: #f8fafc;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 11px;
                color: #334155;
            }
            .total-row.grand-total {
                border-top: 2px solid #0f172a;
                margin-top: 6px;
                padding-top: 6px;
                font-size: 15px;
                font-weight: 900;
                color: #0284c7;
            }

            /* DISCLAIMER */
            .disclaimer {
                padding: 8px 12px;
                background: #f1f5f9;
                text-align: center;
                font-size: 9px;
                font-weight: 700;
                color: #64748b;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
        </style>
    </head>
    <body>
        <div class="document">
            <!-- HEADER -->
            <div class="header">
                <div class="header-left">
                    <div class="business-name">MGR TECHNO</div>
                    <div class="business-tagline">Hardware, Gaming & Computación Personalizada</div>
                    <div class="business-info">
                        <strong>Web:</strong> https://mgrtechno.com.ar<br />
                        <strong>Email:</strong> ventas@mgrtechno.com.ar<br />
                        <strong>Ubicación:</strong> Rosario, Santa Fe, Argentina<br />
                        <strong>Condición frente al IVA:</strong> Responsable Inscripto
                    </div>
                </div>

                <div class="header-center">
                    <div class="voucher-letter">X</div>
                    <div class="voucher-sub">Doc. No Válido Como Factura</div>
                </div>

                <div class="header-right">
                    <div class="document-title">PRESUPUESTO</div>
                    <div class="document-number">Nº ${quote.number}</div>
                    <div class="document-date">
                        <strong>Fecha Emisión:</strong> ${formattedDate}
                    </div>
                    <div class="expiration-badge">
                        ⏰ Válido hasta: ${formattedExpiration}
                    </div>
                    ${
                        quote.currency === "USD" && quote.exchangeRate
                            ? `<div class="document-date" style="font-size: 10px; color: #64748b;">
                                Cotización USD: $${quote.exchangeRate.toFixed(2)} ARS
                               </div>`
                            : ""
                    }
                </div>
            </div>

            <!-- CUSTOMER -->
            <div class="info-box">
                <div class="info-row">
                    <div class="info-col">
                        <span class="label">Cliente:</span>
                        <span class="value">${quote.customer?.name || "Consumidor Final"}</span>
                    </div>
                    <div class="info-col">
                        <span class="label">CUIT / DNI:</span>
                        <span class="value">${quote.customer?.documentNumber || "-"} (${quote.customer?.documentType || "DNI"})</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-col">
                        <span class="label">Email:</span>
                        <span class="value">${quote.customer?.email || "-"}</span>
                    </div>
                    <div class="info-col">
                        <span class="label">Teléfono:</span>
                        <span class="value">${quote.customer?.phone || "-"}</span>
                    </div>
                </div>
                ${
                    customerAddress
                        ? `<div class="info-row">
                            <div class="info-col">
                                <span class="label">Domicilio:</span>
                                <span class="value">${customerAddress}</span>
                            </div>
                            <div class="info-col">
                                <span class="label">Condición IVA:</span>
                                <span class="value">${quote.customer?.ivaCondition || "Consumidor Final"}</span>
                            </div>
                           </div>`
                        : ""
                }
            </div>

            <!-- ITEMS TABLE -->
            <table>
                <thead>
                    <tr>
                        <th class="text-left" style="width: 45%;">Descripción / Producto</th>
                        <th class="text-center" style="width: 15%;">Código / SKU</th>
                        <th class="text-center" style="width: 8%;">Cant.</th>
                        <th class="text-right" style="width: 16%;">Precio Unit. (c/IVA)</th>
                        <th class="text-right" style="width: 16%;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.items
                        .map((it) => {
                            const originLabel =
                                it.origin === "distributor"
                                    ? `<span class="origin-badge">${it.distributor || "DISTRIB"}</span>`
                                    : "";

                            return `
                        <tr>
                            <td class="text-left">
                                ${originLabel}<strong>${it.name}</strong>
                            </td>
                            <td class="text-center font-mono" style="color: #64748b;">
                                ${it.sku || it.distributorSku || "-"}
                            </td>
                            <td class="text-center font-mono">
                                ${it.quantity}
                            </td>
                            <td class="text-right font-mono">
                                ${formatCurrency(it.unitPrice)}
                            </td>
                            <td class="text-right font-mono" style="font-weight: 700;">
                                ${formatCurrency(it.subtotal)}
                            </td>
                        </tr>
                        `;
                        })
                        .join("")}
                </tbody>
            </table>

            <!-- FOOTER & TOTALS -->
            <div class="footer">
                <div class="footer-notes">
                    <strong>Términos y Condiciones:</strong><br />
                    ${quote.terms || "Presupuesto válido hasta la fecha de vencimiento indicada. Precios en pesos sujetos a variación sin previo aviso."}<br /><br />
                    ${
                        quote.notes
                            ? `<strong>Observaciones adicionales:</strong><br />${quote.notes.replace(/\n/g, "<br />")}`
                            : ""
                    }
                </div>

                <div class="footer-totals">
                    <div class="total-row">
                        <span>SUBTOTAL NETO:</span>
                        <span class="font-mono">${formatCurrency(quote.subtotal)}</span>
                    </div>
                    ${
                        quote.ivaTotal > 0
                            ? `<div class="total-row">
                                <span>IVA DISCRIMINADO:</span>
                                <span class="font-mono">${formatCurrency(quote.ivaTotal)}</span>
                               </div>`
                            : ""
                    }
                    ${
                        quote.discountTotal > 0
                            ? `<div class="total-row" style="color: #16a34a;">
                                <span>DESCUENTO:</span>
                                <span class="font-mono">-${formatCurrency(quote.discountTotal)}</span>
                               </div>`
                            : ""
                    }
                    <div class="total-row grand-total">
                        <span>TOTAL:</span>
                        <span class="font-mono">${formatCurrency(quote.total)}</span>
                    </div>
                </div>
            </div>

            <!-- DISCLAIMER -->
            <div class="disclaimer">
                Comprobante provisorio no válido como factura fiscal. Los precios y disponibilidad están garantizados hasta el ${formattedExpiration}.
            </div>
        </div>
    </body>
    </html>
    `;
}
