// app/api/sync/customers/route.ts
import { NextRequest } from "next/server";
import { WOO_HEADERS } from "@/lib/woo";
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { hashPassword } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const page = body.page || 1; // procesar de a una página por llamada
    const PER_PAGE = 50;

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/customers?per_page=${PER_PAGE}&page=${page}`,
        { headers: WOO_HEADERS },
    );

    const customers = await res.json();
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");

    let synced = 0;
    let skipped = 0;

    for (const customer of customers) {
        if (!customer.first_name || !customer.last_name) {
            skipped++;
            continue;
        }

        const existing = await CustomerModel.findOne({ email: customer.email });
        if (existing) {
            skipped++;
            continue;
        }

        const meta = customer.meta_data || [];
        const getMeta = (key: string) =>
            meta.find((m: any) => m.key === key)?.value || "";

        const tempPassword = await hashPassword(
            Math.random().toString(36).slice(-10),
        );

        await CustomerModel.create({
            email: customer.email,
            password: tempPassword,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.billing?.phone || "",
            role:
                customer.role === "administrator"
                    ? "administrator"
                    : "customer",
            billing: {
                firstName: customer.billing?.first_name || "",
                lastName: customer.billing?.last_name || "",
                address1: customer.billing?.address_1 || "",
                city: customer.billing?.city || "",
                state: customer.billing?.state || "",
                postcode: customer.billing?.postcode || "",
                phone: customer.billing?.phone || "",
                country: "AR",
            },
            tipoDocumento: getMeta("billing_tipo_documento") || "DNI",
            numeroDocumento: getMeta("billing_numero_documento") || "",
            wooId: customer.id,
        });
        synced++;
    }

    return Response.json({
        ok: true,
        synced,
        skipped,
        page,
        totalPages,
        hasMore: page < totalPages,
    });
}
