import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/lib/auth";
import { CustomerModel } from "@/models/Customer";

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
                    const user = await getUserByEmail(
                        credentials?.username || "",
                    );

                    if (!user) return null;

                    const valid = await verifyPassword(
                        credentials?.password || "",
                        user.password,
                    );

                    if (!valid) return null;

                    const customer = await CustomerModel.findById(
                        user.customerId,
                    );

                    return {
                        id: user._id.toString(),
                        name: customer
                            ? `${customer.firstName} ${customer.lastName}`
                            : "Usuario",
                        email: user.email,
                        customerId: user.customerId.toString(),
                        role: user.role || "customer",

                        billing: customer?.billing || null,
                        tipoDocumento:
                            customer?.document?.documentType || "DNI",
                        numeroDocumento: customer?.document?.number || "",
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
            if (user) {
                token.customerId = user.customerId;
                token.billing = user.billing;
                token.tipoDocumento = user.tipoDocumento;
                token.numeroDocumento = user.numeroDocumento;
                token.role = user.role;
            }

            return token;
        },
        async session({ session, token }: any) {
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
        maxAge: 60 * 60 * 24 * 3,
    },
    jwt: {
        maxAge: 60 * 60 * 24 * 3,
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
