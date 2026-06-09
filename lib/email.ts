import { Resend } from "resend";
import { OrderDTO } from "@/types/shared/order";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: email,
        subject: "Restablecer contraseña — MGR Techno",
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #d06823; margin-bottom: 8px;">MGR Techno</h2>
                <h3 style="color: #111; margin-bottom: 16px;">Restablecer contraseña</h3>
                <p style="color: #444; margin-bottom: 24px;">
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                    Hacé click en el botón para continuar:
                </p>
                <a href="${resetUrl}"
                   style="display: inline-block; background: #d06823; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                    Restablecer contraseña
                </a>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">
                    Este link expira en 1 hora. Si no solicitaste el cambio, ignorá este email.
                </p>
            </div>
        `,
    });
}

export async function sendOrderConfirmationEmail(order: OrderDTO) {
    const isBankTransfer = order.payments[0].method === "bank_transfer";
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Confirmamos tu pedido #${order.id.toString().slice(-6).toUpperCase()}`,
        html: ` <!DOCTYPE html> <html lang="es"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> </head> <body style=" margin:0; padding:0; background:#030712; font-family:Arial,Helvetica,sans-serif; color:#ffffff; " > <div style=" max-width:700px; margin:0 auto; padding:32px 16px; " > <div style=" background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; " > <!-- Barra superior --> <div style=" height:4px; background:#06b6d4; " ></div> <!-- Header --> <div style=" background:#030712; border-bottom:1px solid #1f2937; padding:32px; text-align:center; " > <h1 style=" margin:0; font-size:30px; font-weight:700; letter-spacing:-0.02em; " > <span style="color:#ffffff;">MGR</span> <span style="color:#06b6d4;">TECHNO</span> </h1> <p style=" margin:12px 0 0; color:#9ca3af; font-size:14px; " > Confirmación de pedido </p> </div> <!-- Contenido --> <div style="padding:32px;"> <h2 style=" margin-top:0; margin-bottom:12px; font-size:24px; color:#ffffff; " > ¡Gracias por tu compra! </h2> <p style=" color:#d1d5db; line-height:1.7; margin-bottom:24px; " > Recibimos correctamente tu pedido. </p> <div style=" display:inline-block; background:#0f172a; border:1px solid #06b6d4; color:#06b6d4; padding:10px 16px; border-radius:999px; font-weight:600; margin-bottom:24px; " > Pedido #${order.id.toString().slice(-6).toUpperCase()} </div> <!-- Resumen --> <div style=" background:#111827; border:1px solid #1f2937; border-radius:12px; overflow:hidden; " > <div style=" padding:18px; border-bottom:1px solid #1f2937; font-weight:600; color:#ffffff; " > Resumen del pedido </div> <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;" > ${order.items.map((item) => ` <tr> <td style=" padding:14px 18px; border-bottom:1px solid #1f2937; color:#ffffff; " > ${item.name} <div style=" color:#9ca3af; font-size:13px; margin-top:4px; " > Cantidad: ${item.quantity} </div> </td> <td align="right" style=" padding:14px 18px; border-bottom:1px solid #1f2937; color:#ffffff; font-weight:600; white-space:nowrap; " > $${item.total.toLocaleString("es-AR")} </td> </tr> `).join("")} </table> <div style=" padding:20px 18px; text-align:right; font-size:24px; font-weight:700; " > <span style="color:#9ca3af;"> Total: </span> <span style="color:#06b6d4;"> $${order.total.toLocaleString("es-AR")} </span> </div> </div> ${isBankTransfer ? ` <div style=" margin-top:24px; background:#0f172a; border:1px solid #06b6d4; border-radius:12px; padding:20px; " > <h3 style=" margin-top:0; margin-bottom:16px; color:#06b6d4; " > Datos para la transferencia </h3> <table cellpadding="6" cellspacing="0" style=" color:#d1d5db; font-size:14px; " > <tr> <td><strong>Banco:</strong></td> <td>${process.env.BANK_NAME}</td> </tr> <tr> <td><strong>Alias:</strong></td> <td>${process.env.BANK_ALIAS}</td> </tr> <tr> <td><strong>CBU:</strong></td> <td>${process.env.BANK_CBU}</td> </tr> <tr> <td><strong>Titular:</strong></td> <td>${process.env.BANK_OWNER}</td> </tr> <tr> <td><strong>CUIT:</strong></td> <td>${process.env.BANK_OWNER_CUIT}</td> </tr> </table> <p style=" margin:18px 0 0; color:#d1d5db; line-height:1.6; " > Una vez realizada la transferencia, enviá el comprobante respondiendo este email para acreditar el pago. </p> </div> ` : ` <div style=" margin-top:24px; background:#0f172a; border:1px solid #1f2937; border-radius:12px; padding:20px; " > <p style=" margin:0; color:#d1d5db; line-height:1.6; " > Nos contactaremos con vos a la brevedad para coordinar el pago y la entrega de tu pedido. </p> </div> `} </div> <!-- Footer --> <div style=" border-top:1px solid #1f2937; padding:24px; text-align:center; color:#9ca3af; font-size:13px; " > © ${new Date().getFullYear()} MGR TECHNO <br /> Gracias por confiar en nosotros. </div> </div> </div> </body> </html> `,
    });
}

export async function sendPaymentConfirmedEmail(order: OrderDTO) {
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Pago confirmado - Pedido #${order.id.toString().slice(-6).toUpperCase()}`,

        html: `
      <div style="
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #ffffff;
        background-color: #0f1115;
        padding: 32px;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background-color: #181c23;
          border: 1px solid #2a2f3a;
          border-radius: 16px;
          padding: 32px;
        ">
          <h1 style="
            margin-top: 0;
            color: #ffffff;
            font-size: 28px;
          ">
            ¡Pago confirmado!
          </h1>

          <p style="color: #cbd5e1;">
            Hola ${order.billing.firstName},
            recibimos correctamente el pago de tu pedido
            <strong>#${order.id.toString().slice(-6).toUpperCase()}</strong>.
          </p>

          <p style="color: #cbd5e1;">
            Ya comenzamos a preparar tu compra.
          </p>

          <div style="
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #2a2f3a;
          ">
            <h2 style="
              color: #ffffff;
              font-size: 18px;
              margin-bottom: 16px;
            ">
              Resumen del pedido
            </h2>

            ${order.items
                .map(
                    (item) => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:12px;
                    color:#cbd5e1;
                  ">
                    <span>
                      ${item.name} x${item.quantity}
                    </span>

                    <span>
                      $${item.total.toLocaleString("es-AR")}
                    </span>
                  </div>
                `,
                )
                .join("")}

            <div style="
              display:flex;
              justify-content:space-between;
              margin-top:24px;
              padding-top:16px;
              border-top:1px solid #2a2f3a;
              font-weight:bold;
              color:#ffffff;
            ">
              <span>Total </span>

              <span>
                $${order.total.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          <div style="
            margin-top: 32px;
            color: #cbd5e1;
          ">
            ${
                order.shippingMethod.method === "local_pickup"
                    ? `
                  <p>
                    Te avisaremos apenas el pedido esté listo
                    para retirar.
                  </p>
                `
                    : `
                  <p>
                    Te notificaremos nuevamente cuando el pedido
                    sea despachado.
                  </p>
                `
            }
          </div>

          <p style="
            margin-top:40px;
            color:#94a3b8;
            font-size:14px;
          ">
            Gracias por confiar en MGR Techno
          </p>
        </div>
      </div>
    `,
    });
}
