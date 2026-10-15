import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, parentId, image } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return Response.json(
                { error: "El nombre de la categoría es obligatorio" },
                { status: 400 },
            );
        }

        await connectDB();

        let baseSlug = body.slug ? slugify(body.slug) : slugify(name);
        if (!baseSlug) {
            baseSlug = `categoria-${Date.now()}`;
        }

        let uniqueSlug = baseSlug;
        let counter = 1;
        while (await CategoryModel.exists({ slug: uniqueSlug })) {
            counter++;
            uniqueSlug = `${baseSlug}-${counter}`;
        }

        const categoryData: any = {
            name: name.trim(),
            slug: uniqueSlug,
            image: image || null,
            parentId:
                parentId && Types.ObjectId.isValid(parentId)
                    ? new Types.ObjectId(parentId)
                    : null,
        };

        const newCategory = await CategoryModel.create(categoryData);

        return Response.json({
            ok: true,
            _id: newCategory._id.toString(),
            category: newCategory,
        });
    } catch (err: any) {
        console.error("Error creating category:", err);
        return Response.json(
            { error: err.message || "Error al crear la categoría" },
            { status: 500 },
        );
    }
}
