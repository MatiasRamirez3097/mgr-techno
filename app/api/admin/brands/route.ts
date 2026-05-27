// app/api/admin/brands/route.ts

import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { BrandModel } from "@/models/Brand";

import { slugify } from "@/lib/utils/slugify";
import { getBrandsBase } from "@/lib/brands/getBrandsBase";
import { mapBrandToDTO } from "@/lib/mappers/brandMapper";

export const runtime = "nodejs";

export async function GET() {
    await connectDB();

    const brands = await getBrandsBase({ limit: 0 });
    return Response.json({
        success: true,
        brands,
    });
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const name = body.name?.trim();

        /*
        |--------------------------------------------------
        | VALIDATION
        |--------------------------------------------------
        */

        if (!name) {
            return Response.json(
                {
                    success: false,

                    error: "El nombre es obligatorio",
                },
                {
                    status: 400,
                },
            );
        }

        /*
        |--------------------------------------------------
        | SLUG
        |--------------------------------------------------
        */

        const slug = slugify(name);

        /*
        |--------------------------------------------------
        | EXISTS
        |--------------------------------------------------
        */

        const exists = await BrandModel.findOne({
            $or: [
                {
                    name: {
                        $regex: `^${name}$`,
                        $options: "i",
                    },
                },
                {
                    slug,
                },
            ],
        });

        if (exists) {
            return Response.json(
                {
                    success: false,

                    error: "La marca ya existe",
                },
                {
                    status: 400,
                },
            );
        }

        /*
        |--------------------------------------------------
        | CREATE
        |--------------------------------------------------
        */

        const brand = await BrandModel.create({
            name,

            slug,
        });

        /*
        |--------------------------------------------------
        | RESPONSE
        |--------------------------------------------------
        */

        return Response.json({
            success: true,

            brand: mapBrandToDTO(brand),
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,

                error: error.message || "Internal server error",
            },
            {
                status: 500,
            },
        );
    }
}
