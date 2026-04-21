import { SupplierDB } from "@/types/backend/supplier";
import { SupplierDTO } from "@/types/shared/supplier";

export function mapSupplierToDTO(supplier: SupplierDB): SupplierDTO {
    return {
        id: supplier._id?.toString(),
        taxId: supplier.taxId ?? null,
        name: supplier.name,

        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        website: supplier.website ?? "",

        address: {
            street: supplier.address?.street ?? "",
            city: supplier.address?.city ?? "",
            state: supplier.address?.state ?? "",
            zip: supplier.address?.zip ?? "",
            country: supplier.address?.country ?? "AR",
        },

        contactName: supplier.contactName ?? "",
        notes: supplier.notes ?? "",

        isActive: supplier.isActive,

        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
    };
}
