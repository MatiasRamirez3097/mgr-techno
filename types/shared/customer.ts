import { OrderDTO } from "./order";

export type CustomerDTO = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    billing?: {
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        state: string;
        postcode: string;
        phone: string;
        country: string | "AR";
    };
    document: {
        documentType: string;
        number: string;
    };
    ivaCondition: {
        code: "RI" | "MONOTRIBUTO" | "CF" | "EXENTO";
        afipId: number;
    };
    createdAt: string;
};

export type CustomerWithOrdersDTO = CustomerDTO & {
    orders: OrderDTO[];
};

export type GetCustomersResponse = {
    customers: CustomerDTO[];
    totalPages: number;
    total: number;
};

export type CustomerFilters = {
    currentPage?: number;
    search?: string;
    page?: number;
    perPage?: number;
    //orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
};
