import { Resend } from "resend";
import { OrderDTO } from "@/types/shared/order";
const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_THEME = {
    brand: "#d06823",
    background: "#030712",
    card: "#111827",
    border: "#374151",
    text: "#ffffff",
    muted: "#9ca3af",
    body: "#d1d5db",
};

function emailLayout({
    title,
    subtitle,
    content,
}: {
    title: string;
    subtitle?: string;
    content: string;
}) {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <body style="margin:0;padding:0;background:${EMAIL_THEME.background};font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center">

                        <div style="max-width:700px;margin:0 auto;padding:32px 16px;">
                            <div style="
                                background:${EMAIL_THEME.card};
                                border:1px solid ${EMAIL_THEME.border};
                                border-radius:16px;
                                overflow:hidden;
                            ">
                                <div style="
                                    height:4px;
                                    background:${EMAIL_THEME.brand};
                                "></div>

                                <div style="
                                    padding:32px;
                                    text-align:center;
                                    border-bottom:1px solid ${EMAIL_THEME.border};
                                    background:${EMAIL_THEME.background};
                                ">
                                    <h1 style="margin:0;color:white;font-size:30px;">
                                        MGR
                                        <span style="color:${EMAIL_THEME.brand}">
                                            TECHNO
                                        </span>
                                    </h1>

                                    ${
                                        subtitle
                                            ? `
                                            <p style="
                                                margin-top:12px;
                                                color:${EMAIL_THEME.muted};
                                            ">
                                                ${subtitle}
                                            </p>
                                        `
                                            : ""
                                    }
                                </div>

                                <div style="padding:32px;">
                                    <h2 style="margin-top:0;color:white;">
                                        ${title}
                                    </h2>

                                    ${content}
                                </div>

                                <div style="
                                    border-top:1px solid ${EMAIL_THEME.border};
                                    padding:24px;
                                    text-align:center;
                                    color:${EMAIL_THEME.muted};
                                    font-size:13px;
                                ">
                                    © ${new Date().getFullYear()} MGR TECHNO
                                    <br />
                                    Gracias por confiar en nosotros.
                                </div>
                            </div>
                        </div>

                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
}

function orderSummary(order: OrderDTO) {
    return `
        <div
            style="
                background:${EMAIL_THEME.card};
                border:1px solid ${EMAIL_THEME.brand};
                border-radius:12px;
                overflow:hidden;
            "
        >
            <div
                style="
                    padding:18px;
                    border-bottom:1px solid ${EMAIL_THEME.brand};
                    font-weight:600;
                    color:#ffffff;
                "
            >
                Resumen del pedido
            </div>

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="border-collapse:collapse;"
            >
                ${order.items
                    .map(
                        (item) => `
                        <tr>
                            <td
                                style="
                                    padding:14px 18px;
                                    border-bottom:1px solid ${EMAIL_THEME.border};
                                    color:#ffffff;
                                "
                            >
                                ${item.name}

                                <div
                                    style="
                                        color:${EMAIL_THEME.muted};
                                        font-size:13px;
                                        margin-top:4px;
                                    "
                                >
                                    Cantidad: ${item.quantity}
                                </div>
                            </td>

                            <td
                                align="right"
                                style="
                                    padding:14px 18px;
                                    border-bottom:1px solid ${EMAIL_THEME.border};
                                    color:#ffffff;
                                    font-weight:600;
                                "
                            >
                                $${item.total.toLocaleString("es-AR")}
                            </td>
                        </tr>
                    `,
                    )
                    .join("")}
            </table>

            <div
                style="
                    padding:20px 18px;
                    text-align:right;
                    font-size:24px;
                    font-weight:700;
                "
            >
                <span style="color:${EMAIL_THEME.muted}">
                    Total:
                </span>

                <span style="color:${EMAIL_THEME.brand}">
                    $${order.total.toLocaleString("es-AR")}
                </span>
            </div>
        </div>
    `;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: email,
        subject: "Restablecer contraseña — MGR Techno",
        html: emailLayout({
            title: "Restablecer contraseña",
            subtitle: "Seguridad de tu cuenta",
            content: ` <p style=" color:${EMAIL_THEME.body}; line-height:1.7; margin-bottom:24px; " > Recibimos una solicitud para restablecer la contraseña de tu cuenta. </p> <p style=" color:${EMAIL_THEME.body}; line-height:1.7; margin-bottom:24px; " > Hacé click en el botón para continuar: </p> <div style="text-align:center;margin:32px 0;"> <a href="${resetUrl}" style=" display:inline-block; background:${EMAIL_THEME.brand}; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:600; font-size:15px; " > Restablecer contraseña </a> </div> <div style=" background:${EMAIL_THEME.background}; border:1px solid ${EMAIL_THEME.border}; border-radius:12px; padding:20px; margin-top:24px; " > <p style=" margin:0; color:${EMAIL_THEME.body}; line-height:1.6; " > Este enlace expira en <strong>1 hora</strong>. </p> <p style=" margin:12px 0 0; color:${EMAIL_THEME.muted}; line-height:1.6; " > Si no solicitaste este cambio, podés ignorar este email. </p> </div> `,
        }),
    });
}

export async function sendOrderConfirmationEmail(order: OrderDTO) {
    const isBankTransfer = order.payments[0].method === "bank_transfer";
    const brandColor = "#d06823";
    const backgroundColor = "#030712";
    const cardColor = "#111827";
    const borderColor = "#374151";
    const textMuted = "#9ca3af";
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Confirmamos tu pedido #${order.id.toString().slice(-6).toUpperCase()}`,
        html: emailLayout({
            title: "¡Gracias por tu compra!",
            subtitle: "Confirmación de pedido",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Recibimos correctamente tu pedido.
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()}
    </div>

    ${orderSummary(order)}

    ${
        isBankTransfer
            ? `
        <div style="
            margin-top:24px;
            background:${EMAIL_THEME.background};
            border:1px solid ${EMAIL_THEME.brand};
            border-radius:12px;
            padding:20px;
        ">
            <h3 style="
                color:${EMAIL_THEME.brand};
                margin-top:0;
                margin-bottom:16px;
            ">
                💳 Datos para la transferencia
            </h3>

            <p style="
                color:${EMAIL_THEME.body};
                line-height:1.7;
                margin-top:0;
            ">
                Realizá la transferencia utilizando los siguientes datos y luego envianos el comprobante a través para poder procesar tu pedido.
            </p>

            <div style="
                background:${EMAIL_THEME.card};
                border:1px solid ${EMAIL_THEME.border};
                border-radius:10px;
                padding:16px;
                margin-top:16px;
            ">
                <div style="margin-bottom:12px;">
                    <div style="color:${EMAIL_THEME.muted};font-size:12px;">
                        Titular
                    </div>
                    <div style="color:${EMAIL_THEME.body};font-weight:600;">
                        ${process.env.BANK_OWNER}
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="color:${EMAIL_THEME.muted};font-size:12px;">
                        Banco
                    </div>
                    <div style="color:${EMAIL_THEME.body};font-weight:600;">
                        ${process.env.BANK_NAME}
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="color:${EMAIL_THEME.muted};font-size:12px;">
                        Alias
                    </div>
                    <div style="
                        color:${EMAIL_THEME.brand};
                        font-weight:700;
                        font-size:15px;
                    ">
                        ${process.env.BANK_ALIAS}
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="color:${EMAIL_THEME.muted};font-size:12px;">
                        CBU
                    </div>
                    <div style="
                        color:${EMAIL_THEME.body};
                        font-family:monospace;
                        font-size:14px;
                    ">
                        ${process.env.BANK_CBU}
                    </div>
                </div>

                <div>
                    <div style="color:${EMAIL_THEME.muted};font-size:12px;">
                        Monto a transferir
                    </div>
                    <div style="
                        color:${EMAIL_THEME.brand};
                        font-size:20px;
                        font-weight:700;
                    ">
                        $${order.total.toLocaleString("es-AR")}
                    </div>
                </div>
            </div>

            <p style="
                color:${EMAIL_THEME.muted};
                font-size:13px;
                margin-top:16px;
                margin-bottom:0;
            ">
                Una vez realizada la transferencia, respondé este email adjuntando el comprobante e indicando tu número de pedido.
            </p>
        </div>
    `
            : `
            <div style="
                margin-top:24px;
                background:${EMAIL_THEME.background};
                border:1px solid ${EMAIL_THEME.border};
                border-radius:12px;
                padding:20px;
            ">
                Nos contactaremos con vos a la brevedad para coordinar el pago y la entrega.
            </div>
        `
    }
`,
        }),
    });
}

export async function sendPaymentConfirmedEmail(order: OrderDTO) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Pago confirmado - Pedido #${order.id.toString().slice(-6).toUpperCase()}`,
        html: emailLayout({
            title: "¡Pago confirmado!",
            subtitle: "Pago acreditado",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Hola ${order.billing.firstName},
        recibimos correctamente el pago de tu pedido.
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()}
    </div>

    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Ya comenzamos a preparar tu compra.
    </p>

    ${orderSummary(order)}

    <div style="
        margin-top:24px;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.border};
        border-radius:12px;
        padding:20px;
    ">
        ${
            order.shippingMethod.method === "local_pickup"
                ? "Te avisaremos apenas el pedido esté listo para retirar."
                : "Te notificaremos nuevamente cuando el pedido sea despachado."
        }
    </div>
`,
        }),
    });
}

// ==========================================
// NUEVOS CORREOS: LOGÍSTICA Y CIERRE
// ==========================================

export async function sendOrderShippedEmail(order: OrderDTO) {
    // Intentamos extraer el link de seguimiento si lo guardás en los notes o algún campo de shipping
    // Si no tenés la URL de seguimiento dinámica todavía, podés sacar el bloque de Andreani.
    const trackingInfo = order.notes
        ? `Código de seguimiento / Notas: ${order.notes}`
        : "";

    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Tu pedido está en camino 🚚 - #${order.id.toString().slice(-6).toUpperCase()}`,
        html: emailLayout({
            title: "¡Tu pedido fue despachado!",
            subtitle: "Actualización de envío",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Hola ${order.billing.firstName}, tenemos buenas noticias:
        <strong>tu pedido ya fue entregado al correo / cadetería y está en camino.</strong>
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()}
    </div>

    ${orderSummary(order)}

    <div style="
        margin-top:24px;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        border-radius:12px;
        padding:20px;
    ">
        <h3 style="color:${EMAIL_THEME.brand};margin-top:0;margin-bottom:12px;">
            📦 Información de envío
        </h3>
        
        <p style="color:${EMAIL_THEME.body};margin:0;line-height:1.6;">
            <strong>Método:</strong> ${
                order.shippingMethod.method === "andreani"
                    ? "Andreani"
                    : "Cadetería (Rosario)"
            }<br>
            <strong>Dirección de entrega:</strong> ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} (${order.shipping.postcode})
        </p>

        ${
            trackingInfo
                ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${EMAIL_THEME.border};color:${EMAIL_THEME.muted};font-size:14px;">
            ${trackingInfo}
        </div>
        `
                : ""
        }
    </div>
`,
        }),
    });
}

export async function sendReadyForPickupEmail(order: OrderDTO) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Tu pedido está listo para retirar 📦 - #${order.id.toString().slice(-6).toUpperCase()}`,
        html: emailLayout({
            title: "¡Tu pedido te espera!",
            subtitle: "Listo para retirar",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Hola ${order.billing.firstName},
        ya terminamos de preparar tu compra. <strong>¡Podés pasar a retirarla cuando quieras!</strong>
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()}
    </div>

    ${orderSummary(order)}

    <div style="
        margin-top:24px;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        border-radius:12px;
        padding:20px;
    ">
        <h3 style="color:${EMAIL_THEME.brand};margin-top:0;margin-bottom:12px;">
            📍 Dónde y cómo retirar
        </h3>
        
        <p style="color:${EMAIL_THEME.body};margin:0;line-height:1.6;">
            Te esperamos en <strong>Caaguazu 3971, Rosario</strong>.<br><br>
            Para poder entregarte el pedido de forma rápida y segura, te pedimos que vengas con tu <strong>DNI</strong> y el <strong>número de pedido</strong> indicado en este correo.
        </p>
    </div>
`,
        }),
    });
}

export async function sendOrderCompletedEmail(order: OrderDTO) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `¡Gracias por elegirnos! 🎉 - Pedido #${order.id.toString().slice(-6).toUpperCase()}`,
        html: emailLayout({
            title: "¡Compra finalizada!",
            subtitle: "Gracias por tu confianza",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Hola ${order.billing.firstName},
        esperamos que estés disfrutando a pleno tus nuevos productos. ¡Gracias por confiar en MGR Techno para armar tu setup!
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()} completado
    </div>

    ${orderSummary(order)}

    <div style="
        margin-top:24px;
        background:${EMAIL_THEME.card};
        border:1px solid ${EMAIL_THEME.border};
        border-radius:12px;
        padding:20px;
    ">
        <h3 style="color:#ffffff;margin-top:0;margin-bottom:12px;font-size:16px;">
            ¿Tuviste algún problema?
        </h3>
        
        <p style="color:${EMAIL_THEME.muted};margin:0;line-height:1.6;font-size:14px;">
            Si necesitás hacer uso de la garantía o tenés alguna duda sobre la instalación de tus componentes, respondé este correo o comunicate a nuestro WhatsApp y te ayudaremos enseguida.
        </p>
    </div>
`,
        }),
    });
}

// En tu archivo lib/email.ts, agregá esto al final:

export async function sendFiscalInvoiceEmail(order: OrderDTO, voucher: any) {
    const isCreditNote = voucher.type === "credit_note";
    const title = isCreditNote
        ? "Nota de Crédito generada"
        : "Tu Factura de Compra";
    const voucherLabel = isCreditNote
        ? "Nota de Crédito"
        : `Factura ${voucher.fiscalData?.fiscalType ?? ""}`;

    // 1. Armamos un nombre de archivo prolijo para el adjunto
    const formattedNumber = String(voucher.voucherNumber).padStart(8, "0");
    const pdfFilename = `${isCreditNote ? "NC" : "Factura"}_${voucher.pointOfSale}-${formattedNumber}.pdf`;

    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `${title} - Pedido #${order.id.toString().slice(-6).toUpperCase()}`,

        // ==========================================
        // 2. MAGIA DE RESEND: ADJUNTAMOS EL PDF
        // ==========================================
        attachments: voucher.pdfUrl
            ? [
                  {
                      filename: pdfFilename,
                      path: voucher.pdfUrl, // Resend descarga la URL y la adjunta como archivo físico
                  },
              ]
            : [],
        html: emailLayout({
            title: title,
            subtitle: "Comprobante Fiscal Electrónico",
            content: `
    <p style="color:${EMAIL_THEME.body};line-height:1.7;">
        Hola ${order.billing.firstName},
        ya emitimos tu comprobante fiscal correspondiente al pedido realizado en nuestra tienda.
        <strong>Encontrarás el documento PDF adjunto a este correo.</strong>
    </p>

    <div style="
        display:inline-block;
        background:${EMAIL_THEME.background};
        border:1px solid ${EMAIL_THEME.brand};
        color:${EMAIL_THEME.brand};
        padding:10px 16px;
        border-radius:999px;
        font-weight:600;
        margin:16px 0 24px;
    ">
        Pedido #${order.id.toString().slice(-6).toUpperCase()}
    </div>

    <div style="
        margin-top:10px;
        background:${EMAIL_THEME.card};
        border:1px solid ${EMAIL_THEME.border};
        border-radius:12px;
        padding:24px;
    ">
        <h3 style="color:#ffffff;margin-top:0;margin-bottom:16px;font-size:16px;border-bottom:1px solid ${EMAIL_THEME.border};padding-bottom:12px;">
            📄 Detalles del Comprobante
        </h3>
        
        <div style="color:${EMAIL_THEME.body};line-height:1.8;font-size:14px;">
            <strong>Tipo:</strong> ${voucherLabel}<br>
            <strong>Número:</strong> ${voucher.pointOfSale}-${formattedNumber}<br>
            <strong>CAE:</strong> ${voucher.cae}<br>
            <strong>Vencimiento CAE:</strong> ${voucher.caeExpiration}
        </div>

        ${
            voucher.pdfUrl
                ? `
        <div style="margin-top:24px;text-align:center;">
            <a href="${voucher.pdfUrl}" 
               style="
                   display:inline-block;
                   background:${EMAIL_THEME.brand};
                   color:#ffffff;
                   text-decoration:none;
                   padding:12px 24px;
                   border-radius:8px;
                   font-weight:600;
                   font-size:14px;
               "
               target="_blank"
            >
                Descargar Factura (Backup)
            </a>
        </div>
        `
                : `
        <p style="color:${EMAIL_THEME.muted};font-size:13px;margin-top:20px;text-align:center;">
            * El comprobante adjunto estará disponible pronto.
        </p>
        `
        }
    </div>

    <p style="color:${EMAIL_THEME.muted};font-size:13px;margin-top:24px;">
        Este documento cumple con las normativas vigentes de AFIP. Conservalo ante cualquier eventualidad o reclamo de garantía.
    </p>
`,
        }),
    });
}
