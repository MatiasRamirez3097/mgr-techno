import { SupplierModel } from "@/models/Supplier";
import { connectDB } from "../mongodb";
import { mapSupplierToDTO } from "../mappers/supplierMapper";

export interface SupplierListItem {
    _id: string;
    name: string;
    taxId?: string;
}

export async function getSuppliers() {
    await connectDB();

    const suppliers = await SupplierModel.find({
        isActive: true,
    })
        .select("_id name taxId contactName phone email")
        .sort({ name: 1 })
        .lean();

    const mapped = suppliers.map(mapSupplierToDTO);
    mapped.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es", {
            sensitivity: "base",
        }),
    );

    return mapped;
}
