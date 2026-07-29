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
            <div className="p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-100 mb-4">
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
                                // 1. Estilos de la cajita flotante
                                contentStyle={{
                                    backgroundColor: "#1f2937", // Fondo gris oscuro (Tailwind gray-800)
                                    borderColor: "#374151", // Borde un poco más claro
                                    borderRadius: "8px", // Bordes redondeados
                                    color: "#f3f4f6", // Texto blanco/gris claro
                                }}
                                // 2. Color del texto del valor (para que haga juego con la barra)
                                itemStyle={{
                                    color: "#10b981",
                                    fontWeight: "bold",
                                }}
                                // 3. El fondo que se ilumina DETRÁS de la barra al pasar el mouse
                                cursor={{ fill: "#374151", opacity: 0.4 }}
                            />
                            <Bar
                                dataKey="ingresos"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                // 4. ESTO SACA EL BORDE BLANCO: Controla la barra exacta que estás tocando
                                activeBar={{ stroke: "none", fill: "#059669" }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* GRÁFICO 2: Cantidad de Ventas (Líneas) */}
            <div className="p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-100 mb-4">
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
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#1f2937",
                                    borderColor: "#374151",
                                    borderRadius: "8px",
                                    color: "#f3f4f6",
                                }}
                                itemStyle={{
                                    color: "#3b82f6",
                                    fontWeight: "bold",
                                }}
                                // En las líneas, el cursor es una línea vertical. La oscurecemos.
                                cursor={{
                                    stroke: "#4b5563",
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />
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
