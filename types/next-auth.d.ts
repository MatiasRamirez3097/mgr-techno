declare module "next-auth" {
    interface User {
        token: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
        role: string;
    }
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
        accessToken: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
        role: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
        role: string;
    }
}
