import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { uploadImageFromUrl } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).role !== "administrator") {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const page = body.page || 1;
    const PER_PAGE = 10; // pocos por vez porque cada upload tarda

    const products = await ProductModel.find({
        // Solo productos que aún tienen URLs de Hostinger
        image: { $regex: "mgrtechno.com.ar" },
    })
        .skip((page - 1) * PER_PAGE)
        .limit(PER_PAGE)
        .lean();

    const total = await ProductModel.countDocuments({
        image: { $regex: "mgrtechno.com.ar" },
    });

    const totalPages = Math.ceil(total / PER_PAGE);
    let migrated = 0;

    for (const product of products) {
        try {
            // Migrar imagen principal
            const newImage = await uploadImageFromUrl(product.image);

            // Migrar galería
            const newImages = await Promise.all(
                product.images
                    .filter((img: string) => img.includes("mgrtechno.com.ar"))
                    .map((img: string) => uploadImageFromUrl(img)),
            );

            // Actualizar en MongoDB
            await ProductModel.findByIdAndUpdate(product._id, {
                image: newImage,
                images: newImages,
            });

            migrated++;
        } catch (e) {
            console.log(`>>> error migrando imagen de ${product.name}:`, e);
        }
    }

    return Response.json({
        ok: true,
        migrated,
        page,
        totalPages,
        hasMore: page < totalPages,
        remaining: total - page * PER_PAGE,
    });
}
