"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; visits: number; visitors: number };

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 shadow-lg">
            <p className="mb-1 font-semibold text-white">
                {weekday(point.date)} {shortDate(point.date)}
            </p>
            <p>
                Visitas: <span className="font-semibold tabular-nums">{point.visits.toLocaleString("es-AR")}</span>
            </p>
            <p>
                Visitantes: <span className="font-semibold tabular-nums">{point.visitors.toLocaleString("es-AR")}</span>
            </p>
        </div>
    );
}

/** Visitas por día (una sola serie; los visitantes únicos van en el tooltip). */
export function VisitsChart({ data }: { data: Point[] }) {
    return (
        <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={12}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#374151", opacity: 0.4 }} />
                    <Bar
                        dataKey="visits"
                        name="Visitas"
                        fill="#d06823"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        activeBar={{ stroke: "none", fill: "#eb701d" }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
