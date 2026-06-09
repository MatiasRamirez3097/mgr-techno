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
        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Confirmación de pedido</title>
</head>

<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <div style="max-width:700px;margin:0 auto;padding:32px 16px;">

    <!-- Card principal -->
    <div
      style="
        background:#111827;
        border:1px solid #1e293b;
        border-radius:16px;
        overflow:hidden;
      "
    >

      <!-- Header -->
      <div
        style="
          background:linear-gradient(135deg,#0ea5e9,#2563eb);
          padding:32px;
          text-align:center;
        "
      >
        <h1
          style="
            margin:0;
            color:white;
            font-size:28px;
            font-weight:700;
          "
        >
          MGR Techno
        </h1>

        <p
          style="
            margin:8px 0 0;
            color:rgba(255,255,255,.9);
          "
        >
          Confirmación de pedido
        </p>
      </div>

      <!-- Contenido -->
      <div style="padding:32px;">

        <h2
          style="
            margin-top:0;
            color:white;
            font-size:24px;
          "
        >
          ¡Gracias por tu compra!
        </h2>

        <p style="color:#cbd5e1;line-height:1.7;">
          Recibimos correctamente tu pedido
          <strong style="color:#38bdf8;">
            #${order.id.toString().slice(-6).toUpperCase()}
          </strong>.
        </p>

        <div
          style="
            background:#0f172a;
            border:1px solid #1e293b;
            border-radius:12px;
            padding:20px;
            margin-top:24px;
          "
        >
          <h3
            style="
              margin-top:0;
              color:white;
            "
          >
            Resumen del pedido
          </h3>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              border-collapse:collapse;
              color:#cbd5e1;
            "
          >
            ${order.items
                .map(
                    (item) => `
                  <tr>
                    <td
                      style="
                        padding:10px 0;
                        border-bottom:1px solid #1e293b;
                      "
                    >
                      ${item.name}
                      <div
                        style="
                          font-size:13px;
                          color:#94a3b8;
                        "
                      >
                        Cantidad: ${item.quantity}
                      </div>
                    </td>

                    <td
                      align="right"
                      style="
                        padding:10px 0;
                        border-bottom:1px solid #1e293b;
                        white-space:nowrap;
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
              margin-top:20px;
              text-align:right;
              font-size:22px;
              font-weight:bold;
              color:white;
            "
          >
            Total:
            <span style="color:#38bdf8;">
              $${order.total.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        ${
            isBankTransfer
                ? `
          <div
            style="
              margin-top:24px;
              background:rgba(14,165,233,.08);
              border:1px solid rgba(14,165,233,.25);
              border-radius:12px;
              padding:20px;
            "
          >
            <h3
              style="
                margin-top:0;
                color:#38bdf8;
              "
            >
              Datos para la transferencia
            </h3>

            <table
              cellpadding="6"
              cellspacing="0"
              style="color:#cbd5e1;"
            >
              <tr>
                <td><strong>Banco:</strong></td>
                <td>${process.env.BANK_NAME}</td>
              </tr>

              <tr>
                <td><strong>Alias:</strong></td>
                <td>${process.env.BANK_ALIAS}</td>
              </tr>

              <tr>
                <td><strong>CBU:</strong></td>
                <td>${process.env.BANK_CBU}</td>
              </tr>

              <tr>
                <td><strong>Titular:</strong></td>
                <td>${process.env.BANK_OWNER}</td>
              </tr>

              <tr>
                <td><strong>CUIT:</strong></td>
                <td>${process.env.BANK_OWNER_CUIT}</td>
              </tr>
            </table>

            <p
              style="
                margin-bottom:0;
                color:#cbd5e1;
                line-height:1.6;
              "
            >
              Una vez realizada la transferencia,
              enviá el comprobante respondiendo este email
              o por WhatsApp para acreditar el pago.
            </p>
          </div>
        `
                : `
          <div
            style="
              margin-top:24px;
              background:#0f172a;
              border:1px solid #1e293b;
              border-radius:12px;
              padding:20px;
            "
          >
            <p
              style="
                margin:0;
                color:#cbd5e1;
                line-height:1.6;
              "
            >
              Nos contactaremos con vos a la brevedad para
              coordinar el pago y la entrega de tu pedido.
            </p>
          </div>
        `
        }

      </div>

      <!-- Footer -->
      <div
        style="
          border-top:1px solid #1e293b;
          padding:24px;
          text-align:center;
          color:#94a3b8;
          font-size:13px;
        "
      >
        © ${new Date().getFullYear()} MGR Techno<br />
        Tecnología para gamers y entusiastas.
      </div>

    </div>
  </div>
</body>
</html>
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
