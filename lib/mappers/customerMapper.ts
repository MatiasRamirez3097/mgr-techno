import { CustomerDB, CustomerWithOrdersDB } from "@/types/backend/customer";
import { CustomerDTO, CustomerWithOrdersDTO } from "@/types/shared/customer";
import { mapOrderToDTO } from "./orderMapper";

export function mapCustomerToDTO(customer: CustomerDB): CustomerDTO {
    return {
        id: customer._id.toString(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email ?? "",
        billing: customer.billing
            ? {
                  firstName: customer.billing?.firstName ?? "",
                  lastName: customer.billing?.lastName ?? "",
                  address1: customer.billing?.address1 ?? "",
                  city: customer.billing?.city ?? "",
                  state: customer.billing?.state ?? "",
                  postcode: customer.billing?.postcode ?? "",
                  phone: customer.billing?.phone ?? "",
                  country: customer.billing?.country ?? "AR",
              }
            : undefined,
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
