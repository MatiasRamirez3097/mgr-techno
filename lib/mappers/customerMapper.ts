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
                  address: customer.billing?.address ?? "",
                  city: customer.billing?.city ?? "",
                  state: customer.billing?.state ?? "",
                  postcode: customer.billing?.postcode ?? "",
                  phone: customer.billing?.phone ?? "",
                  country: customer.billing?.country ?? "AR",
              }
            : undefined,
        document: {
            documentType: customer.document?.documentType ?? "",
            number: customer.document?.number ?? "",
        },
        ivaCondition: {
            code: customer.ivaCondition?.code ?? "CF",
            afipId: customer.ivaCondition?.afipId ?? 5,
        },
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
