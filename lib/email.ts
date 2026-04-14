import { Resend } from "resend";

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
