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

function sanitizeAttributeDefinitions(raw: any): any[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const result: any[] = [];
    for (const def of raw) {
        const key = String(def?.key || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const label = String(def?.label || "").trim();
        if (!key || !label || seen.has(key)) continue;
        seen.add(key);
        const type = ["select", "multiselect", "number", "boolean", "text"].includes(def?.type)
            ? def.type
            : "select";
        const options = Array.isArray(def?.options)
            ? def.options.map((o: any) => String(o).trim()).filter(Boolean)
            : [];
        result.push({
            key,
            label,
            type,
            options,
            unit: def?.unit ? String(def.unit).trim() : "",
            required: Boolean(def?.required),
            filterable: def?.filterable !== undefined ? Boolean(def.filterable) : true,
        });
    }
    return result;
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, parentId, image, attributeDefinitions } = body;

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
            attributeDefinitions: sanitizeAttributeDefinitions(attributeDefinitions),
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
