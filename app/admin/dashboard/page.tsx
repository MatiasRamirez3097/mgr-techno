import { getMonthlySalesStats } from "@/services/graphs/graph"; // Tu función de MongoDB
import SalesCharts from "@/components/graphs/SalesCharts";

export default async function DashboardPage() {
    // Al ser un componente de servidor, podemos llamar a la BD directo
    const salesData = await getMonthlySalesStats();

    // Calculamos el total histórico para mostrar en tarjetitas arriba
    const totalRevenue = salesData.reduce(
        (acc, curr) => acc + curr.ingresos,
        0,
    );
    const totalOrders = salesData.reduce((acc, curr) => acc + curr.ventas, 0);

    return (
        <main className="p-8 min-h-screen">
            <h1 className="text-2xl font-black mb-6">Panel de Control</h1>

            {/* Tarjetas de Resumen Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
                    <p className="text-sm text-gray-500">
                        Monto Histórico Concretado
                    </p>
                    <p className="text-3xl font-bold">
                        ${totalRevenue.toLocaleString("es-AR")}
                    </p>
                </div>
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500">
                        Ventas Históricas Concretadas
                    </p>
                    <p className="text-3xl font-bold">{totalOrders}</p>
                </div>
            </div>

            {/* Los Gráficos */}
            <SalesCharts data={salesData} />
        </main>
    );
}
