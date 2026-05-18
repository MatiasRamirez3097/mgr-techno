import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { mapCustomerToDTO } from "@/lib/mappers/customerMapper";
import { getCustomersBase } from "@/lib/customers/getCustomersBase";

// 🧼 helpers
function normalizeCUIT(cuit?: string) {
    if (!cuit) return undefined;
    return cuit.replace(/[^0-9]/g, "");
}

function cleanString(v?: string) {
    return v?.trim() || undefined;
}

export async function GET() {
    const customers = await getCustomersBase({ query: {} });
    console.log(">>>", customers);
    return Response.json({ customers });
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        // 🧠 1. Normalizar
        //const taxId = normalizeCUIT(body.taxId);
        console.log(body);
        const customerData = {
            firstName: cleanString(body.firstName),
            lastName: cleanString(body.lastName),
            document: {
                documentType: body.documentType,
                number: body.documentNumber,
            },
            email: cleanString(body.email),
            phone: cleanString(body.phone),
            billing: {
                firstName: cleanString(body.firstName),
                lastName: cleanString(body.lastName),
                address1: cleanString(body.address1),
                city: cleanString(body.city),
                state: cleanString(body.state),
                postcode: cleanString(body.postcode),
                phone: cleanString(body.phone),
            },
            address1: cleanString(body.address?.street),
            city: cleanString(body.address?.city),
            state: cleanString(body.address?.state),
            zip: cleanString(body.address?.zip),
            country: body.address?.country || "AR",
        };

        // 🛑 2. Validaciones básicas
        if (!customerData.lastName) {
            return Response.json(
                { success: false, error: "Nombre requerido" },
                { status: 400 },
            );
        }

        // 🛑 3. Evitar duplicado por CUIT
        const existing = await CustomerModel.findOne({
            "document.number": customerData.document.number,
        });

        if (existing) {
            return Response.json(
                {
                    success: false,
                    error: "Ya existe un proveedor con ese CUIT",
                },
                { status: 409 },
            );
        }

        // 💾 4. Crear
        const customer = await CustomerModel.create(customerData);

        // 📦 5. DTO
        const dto = mapCustomerToDTO(customer);

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
