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
    sort = { firstName: 1, lastName: 1 },
}: BaseOptions): Promise<CustomerDTO[]> {
    await connectDB();

    let customerQuery = CustomerModel.find(query).sort(sort);

    if (limit) customerQuery = customerQuery.limit(limit);

    const customers = await customerQuery.lean();
    const mapped = customers.map(mapCustomerToDTO);

    if (sort && (sort.firstName === 1 || sort.lastName === 1)) {
        mapped.sort((a, b) => {
            const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
            const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
            return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
        });
    }

    return mapped;
}
