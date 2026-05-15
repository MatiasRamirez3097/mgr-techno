import { OrderDTO } from "./order";

export type CustomerDTO = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    billing?: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        state: string;
        postcode: string;
        phone: string;
        country: string | "AR";
    };
    createdAt: string;
};

export type CustomerWithOrdersDTO = CustomerDTO & {
    orders: OrderDTO[];
};

export type CustomerFilters = {
    currentPage?: number;
    search?: string;
    page?: number;
    perPage?: number;
    //orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
};
