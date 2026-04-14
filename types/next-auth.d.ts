declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
        accessToken: string;
        customerId: string;
        billing: {
            firstName?: string;
            lastName?: string;
            address1?: string;
            city?: string;
            state?: string;
            postcode?: string;
            phone?: string;
            country?: string;
        } | null;
        tipoDocumento: string;
        numeroDocumento: string;
        role: string;
    }
}
