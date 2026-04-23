import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { CategoryModel } from "@/models/Category";

// 🧼 helpers
function slugify(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function cleanString(v?: string) {
    return v?.trim() || undefined;
}

function normalizeNumber(v: any) {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
}

async function generateUniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let i = 1;

    while (await ProductModel.findOne({ slug })) {
        slug = `${base}-${i}`;
        i++;
    }

    return slug;
}

type CreateProductInput = {
    name: string;
    description?: string;
    categoryId: string;

    regularPrice: number;
    salePrice?: number;

    stock?: number;

    attributes?: Record<string, any>;
};

export async function createProduct(input: CreateProductInput) {
    await connectDB();

    // 🧠 1. Normalizar
    const name = cleanString(input.name);
    const description = cleanString(input.description);

    const regularPrice = normalizeNumber(input.regularPrice);
    const salePrice = normalizeNumber(input.salePrice);

    const stock = normalizeNumber(input.stock) ?? 0;

    const attributes = input.attributes || {};

    // 🛑 2. Validaciones básicas
    if (!name) throw new Error("Nombre requerido");
    if (!input.categoryId) throw new Error("Categoría requerida");
    if (!regularPrice) throw new Error("Precio requerido");

    if (salePrice && salePrice >= regularPrice) {
        throw new Error("El precio de oferta debe ser menor al regular");
    }

    // 🧠 3. Validar categoría y atributos
    const category = await CategoryModel.findById(input.categoryId);

    if (!category) throw new Error("Categoría inválida");

    for (const attr of category.attributes || []) {
        const value = attributes[attr.name];

        if (attr.required && (value === undefined || value === "")) {
            throw new Error(`Falta ${attr.label}`);
        }

        // tipo básico
        if (value !== undefined) {
            if (attr.type === "number" && isNaN(Number(value))) {
                throw new Error(`${attr.label} debe ser numérico`);
            }

            if (attr.type === "select" && attr.options?.length) {
                if (!attr.options.includes(value)) {
                    throw new Error(`${attr.label} inválido`);
                }
            }
        }
    }

    // 🔥 4. Generar slug único
    const slug = await generateUniqueSlug(name);

    // 💾 5. Crear producto
    const product = await ProductModel.create({
        name,
        description,
        categoryId: category._id,

        slug,

        regularPrice,
        salePrice: salePrice ?? null,

        stock,

        attributes,
    });

    return product;
}
