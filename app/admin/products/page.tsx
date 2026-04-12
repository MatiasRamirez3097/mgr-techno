import { WOO_HEADERS } from "@/lib/woo";
import Link from "next/link";
import Image from "next/image";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";

async function getAdminProducts(
    page: number,
    perPage: number,
    search?: string,
    sku?: string,
) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        orderby: "date",
        order: "desc",
    });

    // Woo busca en nombre, descripción y SKU con "search"
    if (search) params.set("search", search);
    // Búsqueda exacta por SKU
    if (sku) params.set("sku", sku);

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?${params.toString()}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const total = parseInt(res.headers.get("X-WP-Total") || "0");
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
    const products = await res.json();
    return { products, total, totalPages };
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

    // Detectamos si la búsqueda parece un SKU o GTIN (solo números o alfanumérico corto)
    const looksLikeSku =
        search && /^[a-zA-Z0-9-_]{2,20}$/.test(search) && !/\s/.test(search);

    // Hacemos búsqueda normal + por SKU en paralelo si aplica
    const [bySearch, bySku] = await Promise.all([
        getAdminProducts(currentPage, perPage, search),
        looksLikeSku
            ? getAdminProducts(1, 10, undefined, search)
            : Promise.resolve(null),
    ]);

    // Combinamos resultados eliminando duplicados
    let { products, total, totalPages } = bySearch;
    if (bySku && bySku.products.length > 0) {
        const existingIds = new Set(products.map((p: any) => p.id));
        const extraProducts = bySku.products.filter(
            (p: any) => !existingIds.has(p.id),
        );
        products = [...extraProducts, ...products];
    }

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
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Producto
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                SKU
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Precio
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Stock
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Estado
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-400 text-sm"
                                >
                                    No se encontraron productos
                                    {search ? ` para "${search}"` : ""}
                                </td>
                            </tr>
                        ) : (
                            products.map((product: any) => (
                                <tr
                                    key={product.id}
                                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                                {product.images?.[0]?.src && (
                                                    <Image
                                                        src={
                                                            product.images[0]
                                                                .src
                                                        }
                                                        alt={product.name}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium line-clamp-1">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    #{product.id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {product.sku || "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-white">
                                            $
                                            {parseFloat(
                                                product.price || "0",
                                            ).toLocaleString("es-AR")}
                                        </p>
                                        {product.on_sale && (
                                            <p className="text-xs text-gray-400 line-through">
                                                $
                                                {parseFloat(
                                                    product.regular_price ||
                                                        "0",
                                                ).toLocaleString("es-AR")}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                                product.stock_status ===
                                                "instock"
                                                    ? "text-green-400 bg-green-400/10 border-green-400/20"
                                                    : "text-red-400 bg-red-400/10 border-red-400/20"
                                            }`}
                                        >
                                            {product.stock_status === "instock"
                                                ? `En stock (${product.stock_quantity ?? "∞"})`
                                                : "Sin stock"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                                product.status === "publish"
                                                    ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                                                    : "text-gray-400 bg-gray-400/10 border-gray-400/20"
                                            }`}
                                        >
                                            {product.status === "publish"
                                                ? "Publicado"
                                                : "Borrador"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="text-xs text-brand hover:brightness-125 transition-all"
                                        >
                                            Editar →
                                        </Link>
                                    </td>
                                </tr>
                            ))
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
