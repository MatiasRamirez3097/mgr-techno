import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SupplierModel } from "@/models/Supplier";
import { mapSupplierToDTO } from "@/lib/mappers/supplierMapper";

// 🧼 helpers
function normalizeCUIT(cuit?: string) {
    if (!cuit) return undefined;
    return cuit.replace(/[^0-9]/g, "");
}

function cleanString(v?: string) {
    return v?.trim() || undefined;
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        // 🧠 1. Normalizar
        const taxId = normalizeCUIT(body.taxId);

        const supplierData = {
            name: cleanString(body.name),
            taxId,
            email: cleanString(body.email),
            phone: cleanString(body.phone),
            website: cleanString(body.website),

            address: {
                street: cleanString(body.address?.street),
                city: cleanString(body.address?.city),
                state: cleanString(body.address?.state),
                zip: cleanString(body.address?.zip),
                country: body.address?.country || "AR",
            },

            contactName: cleanString(body.contactName),
            notes: cleanString(body.notes),

            isActive: body.isActive ?? true,
        };

        // 🛑 2. Validaciones básicas
        if (!supplierData.name) {
            return Response.json(
                { success: false, error: "Nombre requerido" },
                { status: 400 },
            );
        }

        // 🛑 3. Evitar duplicado por CUIT
        if (taxId) {
            const existing = await SupplierModel.findOne({ taxId });

            if (existing) {
                return Response.json(
                    {
                        success: false,
                        error: "Ya existe un proveedor con ese CUIT",
                    },
                    { status: 409 },
                );
            }
        }

        // 💾 4. Crear
        const supplier = await SupplierModel.create(supplierData);

        // 📦 5. DTO
        const dto = mapSupplierToDTO(supplier);

        return Response.json({
            success: true,
            data: dto,
        });
    } catch (error: any) {
        console.error(error);

        // 💥 error de índice único (por si se escapó)
        if (error.code === 11000) {
            return Response.json(
                { success: false, error: "CUIT duplicado" },
                { status: 409 },
            );
        }

        return Response.json(
            { success: false, error: "Error creando proveedor" },
            { status: 500 },
        );
    }
}
