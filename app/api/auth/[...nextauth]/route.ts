import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { WOO_HEADERS } from "@/lib/woo";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "WooCommerce",
            credentials: {
                username: { label: "Email", type: "text" },
                password: { label: "Contraseña", type: "password" },
            },
            async authorize(credentials) {
                try {
                    // 1. JWT token
                    const res = await fetch(
                        `${process.env.WOO_URL}/wp-json/jwt-auth/v1/token`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                username: credentials?.username,
                                password: credentials?.password,
                            }),
                        },
                    );

                    const data = await res.json();
                    if (!res.ok || !data.token) return null;

                    // 2. Datos del usuario con rol (endpoint propio)
                    const meRes = await fetch(
                        `${process.env.WOO_URL}/wp-json/mgr/v1/me`,
                        {
                            headers: { Authorization: `Bearer ${data.token}` },
                        },
                    );
                    const me = await meRes.json();
                    console.log(">>> me:", JSON.stringify(me, null, 2));

                    // 3. Datos del customer de WooCommerce
                    const customerRes = await fetch(
                        `${process.env.WOO_URL}/wp-json/wc/v3/customers/${me.id}?_fields=id,billing,meta_data`,
                        { headers: WOO_HEADERS },
                    );
                    const customer = await customerRes.json();

                    const meta = customer?.meta_data || [];
                    const getMeta = (key: string) =>
                        meta.find((m: any) => m.key === key)?.value || "";

                    return {
                        id: String(me.id),
                        name: me.name,
                        email: me.email,
                        token: data.token,
                        role: me.roles?.[0] || "customer",
                        customerId: customer?.id || null,
                        billing: customer?.billing || null,
                        tipoDocumento: getMeta("billing_tipo_documento"),
                        numeroDocumento: getMeta("billing_numero_documento"),
                    };
                } catch (e) {
                    console.log(">>> authorize error:", e);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            console.log(token);
            if (user) {
                token.accessToken = user.token;
                token.customerId = user.customerId;
                token.billing = user.billing;
                token.tipoDocumento = user.tipoDocumento;
                token.numeroDocumento = user.numeroDocumento;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            session.customerId = token.customerId;
            session.billing = token.billing;
            session.tipoDocumento = token.tipoDocumento;
            session.numeroDocumento = token.numeroDocumento;
            session.user = {
                ...session.user,
                name: token.name,
                email: token.email,
            };
            session.role = token.role;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
