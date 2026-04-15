import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
//import { ProductsTable } from "@/components/admin/ProductsTable";
import { SyncButton } from "@/components/admin/SyncButton";
import { CategoryModel } from "@/models/Category";
import Image from "next/image";

async function getAdminProducts(
    page: number,
    perPage: number,
    search?: string,
) {
    await connectDB();

    const query: any = {};

    if (search) {
        query.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const total = await CategoryModel.countDocuments(query);
    const totalPages = Math.ceil(total / perPage);
    const docs = await CategoryModel.find(query)
        .populate({
            path: "parentId",
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean();
    const categories = docs.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        image: p.image,
        parentId: p.parentId,
        createdAt: p.createdAt?.toISOString?.() || null,
        updatedAt: p.updatedAt?.toISOString?.() || null,
    }));
    return { categories, total, totalPages };
}

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { categories, total, totalPages } = await getAdminProducts(
        currentPage,
        perPage,
        search,
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Productos</h1>
                <div className="flex items-center gap-3">
                    <AdminSearch placeholder="Buscar por nombre, SKU o GTIN..." />
                    <Link
                        href="/admin/products/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nuevo
                    </Link>
                    <SyncButton />
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Nombre de categoria
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Slug
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Categoria Padre
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Fecha
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Accion
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-400 text-sm"
                                >
                                    No se encontraron órdenes
                                    {search ? ` para "${search}"` : ""}
                                </td>
                            </tr>
                        ) : (
                            categories.map((category: any) => {
                                return (
                                    <tr
                                        key={category._id}
                                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                                    {category.image && (
                                                        <Image
                                                            src={category.image}
                                                            alt={category.name}
                                                            fill
                                                            sizes="40px"
                                                            className="object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-white font-medium line-clamp-1">
                                                            {category.name}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-gray-400">
                                                        #{category._id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border">
                                                {category.slug}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            {category.parentId?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(
                                                category.createdAt,
                                            ).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/categories/${category._id}`}
                                                className="text-xs text-brand hover:brightness-125 transition-all"
                                            >
                                                Ver detalle →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                <div className="px-6 py-4 border-t border-gray-800">
                    <AdminPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={total}
                        perPage={perPage}
                    />
                </div>
            </div>
        </div>
    );
}
