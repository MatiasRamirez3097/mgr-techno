import { NextResponse } from "next/server";
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

        // 1. Buscar el producto base
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
            isAvailable,
            ...restOfProduct
        } = originalProduct as Record<string, unknown>;

        // 3. Generar un slug único para el Outlet
        const baseSlug = `${String(slug || "producto")}-outlet`;
        let newSlug = baseSlug;
        let counter = 1;

        while (await ProductModel.exists({ slug: newSlug })) {
            counter++;
            newSlug = `${baseSlug}-${counter}`;
        }

        // 4. Armar la data del nuevo producto
        const newProductData = {
            ...restOfProduct,
            name: `${String(name || "Producto")} (OUTLET)`,
            slug: newSlug,
            sku: sku ? `${String(sku)}-OUT` : undefined,
            isOutlet: true,
            status: "draft",
            availableStock: 0,
            reservedStock: 0,
            totalStock: 0,
            isAvailable: false,
        };

        // 5. Insertar en la base de datos
        const newOutletProduct = await ProductModel.create(newProductData);

        return NextResponse.json({
            success: true,
            id: newOutletProduct._id.toString(),
            message: "Producto de Outlet creado correctamente",
        });
    } catch (error: unknown) {
        console.error("Error al duplicar producto a outlet:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno del servidor al duplicar el producto",
            },
            { status: 500 },
        );
    }
}
