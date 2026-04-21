export type SupplierDTO = {
    id: string;
    taxId: string | null;
    name: string;
    email: string;
    phone: string;
    website: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    contactName: string;
    notes: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
