export const dynamic = "force-dynamic";

import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { CategoryModel } from "@/models/Category";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { buttonClass } from "@/components/admin/ui/styles";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";
import { ViewDetailLink } from "@/components/admin/ui/ViewDetailLink";

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
            <AdminPageHeader
                title="Categorías"
                actions={
                    <>
                        <AdminSearch placeholder="Buscar categoría..." />
                        <Link href="/admin/categories/new" className={buttonClass.primary}>
                            + Nueva categoría
                        </Link>
                    </>
                }
            />

            <ResponsiveTable
                rows={categories as any[]}
                getRowKey={(category) => category._id}
                rowHref={(category) => `/admin/categories/${category._id}`}
                empty={`No se encontraron categorías${search ? ` para "${search}"` : ""}`}
                columns={[
                    {
                        key: "image",
                        header: "",
                        mobile: "media",
                        desktop: false,
                        cell: (category) => <CategoryThumb category={category} />,
                    },
                    {
                        key: "name",
                        header: "Nombre de categoría",
                        mobile: "title",
                        cell: (category) => (
                            <div className="flex items-center gap-3">
                                <span className="hidden md:block">
                                    <CategoryThumb category={category} />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm text-white font-medium line-clamp-1">{category.name}</p>
                                    <p className="hidden md:block text-xs text-gray-500 font-mono">#{category._id.slice(-6)}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "slug",
                        header: "Slug",
                        mobile: "subtitle",
                        cell: (category) => (
                            <span className="text-xs font-mono md:px-2.5 md:py-1 md:rounded-full md:border md:border-gray-800 text-gray-300 md:bg-gray-800/40 break-all">
                                {category.slug}
                            </span>
                        ),
                    },
                    {
                        key: "parent",
                        header: "Categoría padre",
                        className: "text-gray-300",
                        cell: (category) => category.parentId?.name || "—",
                    },
                    {
                        key: "attributes",
                        header: "Atributos",
                        cell: (category) =>
                            category.attributesCount > 0 ? (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/15 text-brand border border-brand/30 whitespace-nowrap">
                                    {category.attributesCount} {category.attributesCount === 1 ? "atributo" : "atributos"}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">—</span>
                            ),
                    },
                    {
                        key: "createdAt",
                        header: "Fecha",
                        mobile: "hidden",
                        className: "text-gray-400 whitespace-nowrap",
                        cell: (category) => (category.createdAt ? new Date(category.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"),
                    },
                    {
                        key: "actions",
                        header: "Acciones",
                        align: "right",
                        mobile: "hidden",
                        cell: (category) => (
                            <ViewDetailLink href={`/admin/categories/${category._id}`} label="Editar categoría" icon="edit" />
                        ),
                    },
                ]}
            />

            <div className="mt-4">
                <AdminPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    limit={perPage}
                />
            </div>
        </div>
    );
}

function CategoryThumb({ category }: { category: { name: string; image?: string | null } }) {
    return (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
            {category.image ? (
                <Image src={category.image} alt={category.name} fill sizes="40px" className="object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">📁</div>
            )}
        </div>
    );
}
