import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { mapCustomerToDTO } from "@/lib/mappers/customerMapper";
import { getCustomersBase } from "@/services/customers/getCustomersBase";
import { IVA_CONDITIONS, IvaConditionCode } from "@/lib/afip/constants";

function cleanString(v?: string) {
    return v?.trim() || undefined;
}

export async function GET() {
    const customers = await getCustomersBase({ query: {} });
    return Response.json({ customers });
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const ivaCode = (cleanString(body.ivaCondition) ||
            "CF") as IvaConditionCode;
        const ivaMeta = IVA_CONDITIONS[ivaCode] || IVA_CONDITIONS.CF;

        const prepareData = {
            firstName: cleanString(body.firstName),
            lastName: cleanString(body.lastName),
            phone: cleanString(body.phone),
            ivaCondition: {
                code: ivaCode,
                afipId: ivaMeta.afipId,
            },
            billing: {
                firstName: cleanString(body.firstName),
                lastName: cleanString(body.lastName),
                address: cleanString(body.address),
                city: cleanString(body.city),
                state: cleanString(body.state),
                postcode: cleanString(body.postcode),
                phone: cleanString(body.phone),
                country: "AR",
            },
            document: {
                documentType: body.documentType,
                number: body.documentNumber,
            },
        };

        const cleanedEmail = cleanString(body.email);

        const customerData = cleanedEmail
            ? {
                  ...prepareData,
                  email: cleanedEmail,
              }
            : prepareData;

        // 🛑 2. Validaciones básicas
        if (!customerData.lastName && !customerData.firstName) {
            return Response.json(
                { success: false, error: "Nombre o apellido requerido" },
                { status: 400 },
            );
        }

        // 🛑 3. Evitar duplicado por documento/CUIT
        if (customerData.document.number) {
            const existing = await CustomerModel.findOne({
                "document.number": customerData.document.number,
            });

            if (existing) {
                return Response.json(
                    {
                        success: false,
                        error: "Ya existe un cliente con ese documento/CUIT",
                    },
                    { status: 409 },
                );
            }
        }

        // 💾 4. Crear
        const customer = await CustomerModel.create(customerData);

        // 📦 5. DTO
        const dto = mapCustomerToDTO(customer);

        return Response.json({
            success: true,
            id: dto.id,
            data: dto,
        });
    } catch (error: any) {
        console.error(error);

        if (error.code === 11000) {
            return Response.json(
                { success: false, error: "Documento o email duplicado" },
                { status: 409 },
            );
        }

        return Response.json(
            { success: false, error: "Error creando cliente" },
            { status: 500 },
        );
    }
}
