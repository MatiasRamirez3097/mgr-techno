import React from "react";
interface NormalizedProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
}

interface Props {
    products: NormalizedProduct[];
    search: string;
}

export const DistributorsTable = ({ products, search }: Props) => {
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-800/50 border-b border-gray-800">
                    <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                            Distributor
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                            SKU
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                            Product
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                            Stock
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                            Price
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {products.length > 0 ? (
                        products.map((prod) => (
                            <tr
                                key={`${prod.distributor}-${prod.id}`}
                                className="hover:bg-gray-800/30 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            prod.distributor === "Elit"
                                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        }`}
                                    >
                                        {prod.distributor}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400">
                                    {prod.sku}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-200">
                                    {prod.name}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={
                                            prod.stock > 0
                                                ? "text-emerald-400"
                                                : "text-red-400"
                                        }
                                    >
                                        {prod.stock > 0
                                            ? `${prod.stock} units`
                                            : "Out of stock"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-white">
                                    ${prod.price.toLocaleString("en-US")}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={5}
                                className="px-6 py-12 text-center text-gray-500"
                            >
                                {search
                                    ? "No results found for this search."
                                    : "Use the search bar to query distributor catalogs."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
