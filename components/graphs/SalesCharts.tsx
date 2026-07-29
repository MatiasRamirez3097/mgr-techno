"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

export default function SalesCharts({ data }: { data: any[] }) {
    // Formateador para que los números se vean como pesos argentinos
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(value);

    if (!data || data.length === 0)
        return <p>No hay datos suficientes para graficar.</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* GRÁFICO 1: Ingresos por Mes (Barras) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Ingresos Mensuales
                </h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#eee"
                            />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: "#666" }}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(val) => `$${val / 1000}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value: any) =>
                                    formatCurrency(Number(value))
                                }
                            />
                            <Bar
                                dataKey="ingresos"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* GRÁFICO 2: Cantidad de Ventas (Líneas) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Ventas Concretadas
                </h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#eee"
                            />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: "#666" }}
                                axisLine={false}
                            />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="ventas"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
