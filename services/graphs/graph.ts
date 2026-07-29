import { OrderModel } from "@/models/Order"; // Ajustá la ruta a tu modelo
import { connectDB } from "@/lib/mongodb";
export async function getMonthlySalesStats() {
    await connectDB();

    const stats = await OrderModel.aggregate([
        // 1. Filtramos SOLO las completadas
        {
            $match: { status: "completed" },
        },
        // 2. Agrupamos por Año y Mes
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                },
                totalAmount: { $sum: "$total" }, // Suma el monto
                totalOrders: { $sum: 1 }, // Cuenta la cantidad
            },
        },
        // 3. Ordenamos cronológicamente (del más viejo al más nuevo)
        {
            $sort: { "_id.year": 1, "_id.month": 1 },
        },
    ]);

    // 4. Formateamos los datos para que el gráfico los entienda fácil
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

    return stats.map((item) => ({
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        ingresos: item.totalAmount,
        ventas: item.totalOrders,
    }));
}
