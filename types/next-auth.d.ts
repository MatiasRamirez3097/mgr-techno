declare module "next-auth" {
    interface User {
        token: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
    }
    interface Session {
        accessToken: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken: string;
        customerId: number | null;
        billing: any;
        tipoDocumento: string;
        numeroDocumento: string;
    }
}
