// Interfaces (you can move these to a separate types file, e.g., types/distributors.ts)
export interface NormalizedProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
}

// Function executed exclusively on the server
async function getDistributorProducts(
    searchQuery: string,
): Promise<NormalizedProduct[]> {
    if (!searchQuery) return [];

    try {
        const elitUrl = new URL(
            "https://clientes.elit.com.ar/v1/api/productos",
        );
        elitUrl.searchParams.append("nombre", searchQuery); // Elit API still expects 'nombre'
        elitUrl.searchParams.append("limit", "50");

        // Fetch to Elit API
        const elitResponse = await fetch(elitUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: Number(process.env.ELIT_USER_ID),
                token: process.env.ELIT_TOKEN,
            }),
            // Crucial for dynamic searches in Next.js: disable caching
            cache: "no-store",
        });

        if (!elitResponse.ok) {
            console.error(`Elit API Error: ${elitResponse.status}`);
            return [];
        }

        const dataElit: any[] = await elitResponse.json();

        // Normalize the data
        const elitProducts: NormalizedProduct[] = dataElit.map((prod) => ({
            id: prod.id,
            distributor: "Elit",
            sku: prod.codigo_producto,
            name: prod.nombre,
            price: Number(prod.precio) || 0,
            stock: Number(prod.stock) || 0,
            image: prod.imagen || null,
        }));

        // Future integration for NewBytes or others:
        // const newBytesData = await fetchNewBytes(searchQuery);
        // return [...elitProducts, ...newBytesData];

        return elitProducts;
    } catch (error) {
        console.error("Error fetching distributors:", error);
        return [];
    }
}

// Server Component
export default async function ComparatorPage({
    searchParams,
}: {
    searchParams: { query?: string };
}) {
    // Extract the search query from the URL (e.g., /admin/comparator?query=ryzen)
    const query = searchParams?.query || "";

    // Server-side API call
    const products = await getDistributorProducts(query);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
                Distributor Price Comparator
            </h1>

            {/* 
              Omitting the 'action' attribute makes the form submit to the current URL.
              Method "GET" appends the input name 'query' to the URL.
            */}
            <form method="GET" className="mb-8 flex gap-3">
                <input
                    type="text"
                    name="query"
                    defaultValue={query}
                    placeholder="Search products by name, brand, or model..."
                    className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    Search
                </button>
            </form>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">
                                Distributor
                            </th>
                            <th className="p-4 font-semibold text-gray-600">
                                SKU
                            </th>
                            <th className="p-4 font-semibold text-gray-600">
                                Product
                            </th>
                            <th className="p-4 font-semibold text-gray-600">
                                Stock
                            </th>
                            <th className="p-4 font-semibold text-gray-600">
                                Price
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.length > 0 ? (
                            products.map((prod) => (
                                <tr
                                    key={`${prod.distributor}-${prod.id}`}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <td className="p-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                prod.distributor === "Elit"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-green-100 text-green-800"
                                            }`}
                                        >
                                            {prod.distributor}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {prod.sku}
                                    </td>
                                    <td className="p-4 font-medium text-gray-800">
                                        {prod.name}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={
                                                prod.stock > 0
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                            }
                                        >
                                            {prod.stock > 0
                                                ? `${prod.stock} units`
                                                : "Out of stock"}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900">
                                        ${prod.price.toLocaleString("en-US")}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="p-8 text-center text-gray-500"
                                >
                                    {query
                                        ? "No results found for this search."
                                        : "Perform a search to view prices."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
