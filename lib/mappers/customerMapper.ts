import { CustomerDB, CustomerWithOrdersDB } from "@/types/backend/customer";
import { CustomerDTO, CustomerWithOrdersDTO } from "@/types/shared/customer";
import { mapOrderToDTO } from "./orderMapper";

export function mapCustomerToDTO(customer: CustomerDB): CustomerDTO {
    return {
        id: customer._id.toString(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        createdAt: customer.createdAt.toISOString(),
    };
}

export function mapCustomerWithOrdersToDTO(
    customer: CustomerWithOrdersDB,
): CustomerWithOrdersDTO {
    return {
        ...mapCustomerToDTO(customer),
        orders: customer.orders.map(mapOrderToDTO),
    };
}
