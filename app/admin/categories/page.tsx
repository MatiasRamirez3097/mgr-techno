export const dynamic = "force-dynamic";

import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { CategoryModel } from "@/models/Category";
import Image from "next/image";

async function getAdminCategories(
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
        attributesCount: Array.isArray(p.attributeDefinitions)
            ? p.attributeDefinitions.length
            : 0,
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

export default async function AdminCategoriesPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { categories, total, totalPages } = await getAdminCategories(
        currentPage,
        perPage,
        search,
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Categorías</h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <AdminSearch placeholder="Buscar categoría..." />
                    <Link
                        href="/admin/categories/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nueva categoría
                    </Link>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Nombre de categoría
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Slug
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Categoría Padre
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Atributos
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Fecha
                            </th>
                            <th className="text-right text-xs text-gray-400 font-medium px-6 py-4">
                                Acciones
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
                                    No se encontraron categorías
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
                                                    {category.image ? (
                                                        <Image
                                                            src={category.image}
                                                            alt={category.name}
                                                            fill
                                                            sizes="40px"
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                                                            📁
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-white font-medium line-clamp-1">
                                                            {category.name}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        #{category._id.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-gray-800 text-gray-300 bg-gray-800/40">
                                                {category.slug}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {category.parentId?.name || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {category.attributesCount > 0 ? (
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/15 text-brand border border-brand/30">
                                                    {category.attributesCount}{" "}
                                                    {category.attributesCount === 1
                                                        ? "atributo"
                                                        : "atributos"}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {category.createdAt
                                                ? new Date(
                                                      category.createdAt,
                                                  ).toLocaleDateString("es-AR", {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric",
                                                  })
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                    href={`/admin/categories/${category._id}`}
                                                    title="Editar categoría"
                                                    aria-label="Editar categoría"
                                                    className="w-8 h-8 rounded-lg border bg-gray-800/80 border-gray-700/80 text-gray-300 hover:text-brand hover:bg-brand/10 hover:border-brand/40 flex items-center justify-center transition-all"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={1.8}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                                        />
                                                    </svg>
                                                </Link>
                                            </div>
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
                        totalItems={total}
                        limit={perPage}
                    />
                </div>
            </div>
        </div>
    );
}
