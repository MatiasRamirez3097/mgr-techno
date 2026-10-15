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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Panel de Control</h1>
                <span className="text-xs text-gray-500 font-medium">
                    Actualizado al día de hoy
                </span>
            </div>

            {/* Tarjetas de Resumen KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tarjeta 1: Mes Actual */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Este Mes ({currentMonthStr.split(" ")[0]})
                    </p>
                    <p className="text-3xl font-extrabold text-white mt-2">
                        ${currentMonthTotal.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-indigo-400 mt-2 font-medium">
                        Facturación mensual
                    </p>
                </div>

                {/* Tarjeta 2: Año Actual */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Este Año ({currentYearStr})
                    </p>
                    <p className="text-3xl font-extrabold text-white mt-2">
                        ${currentYearTotal.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-purple-400 mt-2 font-medium">
                        Facturación anual acumulada
                    </p>
                </div>

                {/* Tarjeta 3: Histórico */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Histórico Total
                    </p>
                    <p className="text-3xl font-extrabold text-white mt-2">
                        ${totalRevenue.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-emerald-400 mt-2 font-medium">
                        Total histórico registrado
                    </p>
                </div>

                {/* Tarjeta 4: Cantidad de Ventas */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Ventas Concretadas
                    </p>
                    <p className="text-3xl font-extrabold text-white mt-2">
                        {totalOrders}
                    </p>
                    <p className="text-xs text-brand mt-2 font-medium">
                        Órdenes de compra finalizadas
                    </p>
                </div>
            </div>

            {/* Los Gráficos */}
            <SalesCharts data={salesData} />
        </div>
    );
}
