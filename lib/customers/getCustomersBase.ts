import { CustomerModel } from "@/models/Customer";
import { mapCustomerToDTO } from "@/lib/mappers/customerMapper";
import { connectDB } from "@/lib/mongodb";
import type { CustomerDTO } from "@/types/shared/customer";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getCustomersBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<CustomerDTO[]> {
    await connectDB();

    const customers = await CustomerModel.find({
        status: "publish",
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();

    return customers.map(mapCustomerToDTO);
}
