import { NextResponse } from "next/server";
// Ajustá estas importaciones a la ruta real de tu proyecto
import { ProductModel } from "@/models";
import { connectDB } from "@/lib/mongodb";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export async function POST(req: Request, { params }: Props) {
    try {
        await connectDB();
        const { id } = await params;

        // 1. Buscar el producto base (usamos .lean() para obtener un objeto JS puro)
        const originalProduct = await ProductModel.findById(id).lean();

        if (!originalProduct) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 },
            );
        }

        // 2. Extraer los campos que NO queremos copiar tal cual
        const {
            _id,
            createdAt,
            updatedAt,
            slug,
            sku,
            name,
            availableStock,
            reservedStock,
            totalStock,
            ...restOfProduct
        } = originalProduct as any;

        // 3. Generar un slug único para el Outlet
        const baseSlug = `${slug}-outlet`;
        let newSlug = baseSlug;
        let counter = 1;

        // Bucle por si ya existe el slug (ej: clonás el outlet de un outlet)
        while (await ProductModel.exists({ slug: newSlug })) {
            newSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 4. Armar la data del nuevo producto
        const newProductData = {
            ...restOfProduct,
            name: `${name} (OUTLET)`,
            slug: newSlug,
            sku: sku ? `${sku}-OUT` : undefined, // Le agregamos el sufijo al SKU original
            isOutlet: true, // ¡Asegurate de haber agregado este campo al ProductSchema!
            status: "draft", // Siempre nace en borrador para que lo revises
            // El stock nace en 0, se alimentará cuando recepciones la compra
            availableStock: 0,
            reservedStock: 0,
            totalStock: 0,
        };

        // 5. Insertar en la base de datos
        const newOutletProduct = await ProductModel.create(newProductData);

        return NextResponse.json({
            success: true,
            id: newOutletProduct._id,
            message: "Producto de Outlet creado correctamente",
        });
    } catch (error: any) {
        console.error("Error al duplicar producto a outlet:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al duplicar el producto" },
            { status: 500 },
        );
    }
}
