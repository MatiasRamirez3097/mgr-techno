import { CustomerModel } from "@/models";
import { mapCustomerToDTO } from "@/lib/mappers/customerMapper";
import { connectDB } from "@/lib/mongodb";
import type { CustomerDTO } from "@/types/shared/customer";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getCustomersBase({
    limit = undefined,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<CustomerDTO[]> {
    await connectDB();

    let customerQuery = CustomerModel.find(query).sort(sort);

    if (limit) customerQuery = customerQuery.limit(limit);

    const customers = await customerQuery.lean();

    return customers.map(mapCustomerToDTO);
}
