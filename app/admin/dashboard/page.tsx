import { getMonthlySalesStats } from "@/services/graphs/graph";
import SalesCharts from "@/components/graphs/SalesCharts";

export default async function DashboardPage() {
    // 1. Traemos los datos agrupados de la base de datos (una sola consulta)
    const salesData = await getMonthlySalesStats();

    // 2. Totales históricos
    const totalRevenue = salesData.reduce(
        (acc, curr) => acc + curr.ingresos,
        0,
    );
    const totalOrders = salesData.reduce((acc, curr) => acc + curr.ventas, 0);

    // 3. Determinar dinámicamente el mes y año actual
    const now = new Date();
    const currentYearStr = now.getFullYear().toString();
    const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
    ];
    const currentMonthStr = `${monthNames[now.getMonth()]} ${currentYearStr}`; // Ej: "Jul 2026"

    // 4. Filtrar los ingresos del MES actual
    // Buscamos si existe el objeto de este mes en el array. Si no hay ventas aún, da 0.
    const currentMonthData = salesData.find((d) => d.month === currentMonthStr);
    const currentMonthTotal = currentMonthData ? currentMonthData.ingresos : 0;

    // 5. Filtrar los ingresos del AÑO actual
    // Sumamos todos los meses cuyo string contenga el año actual (ej: todos los que tengan "2026")
    const currentYearTotal = salesData
        .filter((d) => d.month.includes(currentYearStr))
        .reduce((acc, curr) => acc + curr.ingresos, 0);

    return (
        <main className="p-8 min-h-screen">
            <h1 className="text-2xl font-black mb-6">Panel de Control</h1>

            {/* Tarjetas de Resumen: Ajustamos el grid a 4 columnas en pantallas grandes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tarjeta 1: Mes Actual */}
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Este Mes
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        ${currentMonthTotal.toLocaleString("es-AR")}
                    </p>
                </div>

                {/* Tarjeta 2: Año Actual */}
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Este Año
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        ${currentYearTotal.toLocaleString("es-AR")}
                    </p>
                </div>

                {/* Tarjeta 3: Histórico */}
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Histórico (Total)
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        ${totalRevenue.toLocaleString("es-AR")}
                    </p>
                </div>

                {/* Tarjeta 4: Cantidad de Ventas */}
                <div className="p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Ventas Concretadas
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        {totalOrders}
                    </p>
                </div>
            </div>

            {/* Los Gráficos */}
            <SalesCharts data={salesData} />
        </main>
    );
}
