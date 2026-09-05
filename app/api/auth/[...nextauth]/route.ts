import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/lib/auth";
import { CustomerModel } from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User"; // Importamos UserModel
import jwt from "jsonwebtoken"; // Instalalo si no lo tenés: npm i jsonwebtoken

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials", // Le cambié el nombre de "WooCommerce" a "Credentials"
            credentials: {
                username: { label: "Email", type: "text" },
                password: { label: "Contraseña", type: "password" },
                magicToken: { label: "Token", type: "text" }, // <-- 1. AGREGAMOS ESTE CAMPO
            },
            async authorize(credentials) {
                try {
                    // ==========================================
                    // CASO A: INICIO DE SESIÓN POR MAGIC LINK
                    // ==========================================
                    await connectDB();
                    if (credentials?.magicToken) {
                        try {
                            // Verificamos el token (Firma y expiración)
                            const decoded = jwt.verify(
                                credentials.magicToken,
                                process.env.NEXTAUTH_SECRET!,
                            ) as { email: string };

                            // Si es válido, buscamos al usuario por el email extraído del token
                            const user = await UserModel.findOne({
                                email: decoded.email,
                            });
                            if (!user) return null;

                            // Buscamos los datos de facturación
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
                                numeroDocumento:
                                    customer?.document?.number || "",
                            };
                        } catch (tokenError) {
                            console.log(
                                ">>> Error verificando magicToken:",
                                tokenError,
                            );
                            return null; // El token expiró, fue modificado o es inválido
                        }
                    }

                    // ==========================================
                    // CASO B: INICIO DE SESIÓN TRADICIONAL
                    // ==========================================
                    if (credentials?.username && credentials?.password) {
                        const normalizedEmail = credentials.username
                            .toLowerCase()
                            .trim();
                        const user = await getUserByEmail(normalizedEmail);
                        if (!user) return null;

                        const valid = await verifyPassword(
                            credentials.password,
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
                    }

                    // Si no mandaron ni Token ni Usuario/Pass
                    return null;
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
