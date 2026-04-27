import { SupplierModel } from "@/models/Supplier";
import { connectDB } from "../mongodb";
import { mapSupplierToDTO } from "../mappers/supplierMapper";

export interface SupplierListItem {
    _id: string;
    name: string;
    taxId?: string;
}

export async function getSupplierById(id: string) {
    await connectDB();

    const supplier = await SupplierModel.findById(id).lean();

    return mapSupplierToDTO(supplier);
}
