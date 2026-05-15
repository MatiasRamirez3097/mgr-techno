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
    const isBankTransfer = order.paymentMethod === "bacs";
    await resend.emails.send({
        from: "MGR Techno <noreply@mgrtechno.com.ar>",
        to: order.customerEmail,
        subject: `Confirmamos tu pedido #${order.id.toString().slice(-6).toUpperCase()}`,
        html: `
      <div style="font-family:sans-serif">
        <h1>¡Gracias por tu compra!</h1>

        <p>
          Recibimos correctamente tu pedido
          <strong>#${order.id.toString().slice(-6).toUpperCase()}</strong>.
        </p>

        <h2>Resumen</h2>

        <ul>
          ${order.items
              .map(
                  (item) => `
                <li>
                  ${item.name} x${item.quantity}
                  - $${item.total.toLocaleString("es-AR")}
                </li>
              `,
              )
              .join("")}
        </ul>

        <p>
          <strong>Total:</strong>
          $${order.total.toLocaleString("es-AR")}
        </p>

        ${
            isBankTransfer
                ? `
              <hr />

              <h2>Datos para la transferencia</h2>

              <p>
                Podés realizar la transferencia a:
              </p>

              <ul>
                <li><strong>Banco:</strong>${process.env.BANK_NAME}</li>
                <li><strong>Alias:</strong>${process.env.BANK_ALIAS}</li>
                <li><strong>CBU:</strong>${process.env.BANK_CBU}</li>
                <li><strong>Titular:</strong>${process.env.BANK_OWNER}</li>
                <li><strong>CUIT:</strong>${process.env.BANK_OWNER_CUIT}</li>
              </ul>

              <p>
                Una vez realizada, por favor enviá el comprobante
                respondiendo este email o por WhatsApp.
              </p>
            `
                : `
              <hr />

              <p>
                Nos contactaremos con vos a la brevedad
                para coordinar el pago y la entrega.
              </p>
            `
        }
      </div>
    `,
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
                order.shippingMethod === "local_pickup"
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
