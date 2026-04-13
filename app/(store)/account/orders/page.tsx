export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "text-yellow-400 bg-yellow-400/10" },
    processing: { label: "En proceso", color: "text-blue-400 bg-blue-400/10" },
    on_hold: { label: "En espera", color: "text-orange-400 bg-orange-400/10" },
    completed: { label: "Completado", color: "text-green-400 bg-green-400/10" },
    cancelled: { label: "Cancelado", color: "text-red-400 bg-red-400/10" },
    refunded: { label: "Reembolsado", color: "text-gray-400 bg-gray-400/10" },
    failed: { label: "Fallido", color: "text-red-400 bg-red-400/10" },
};

export default async function OrdersPage() {
    const session = await getServerSession(authOptions);
    await connectDB();

    const orders = await OrderModel.find({
        customerId: (session as any).customerId,
    })
        .sort({ createdAt: -1 })
        .lean();

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-white">Mis pedidos</h1>

            {orders.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center text-gray-400">
                    <p>Todavía no realizaste ningún pedido.</p>
                </div>
            ) : (
                orders.map((order: any) => {
                    const status = STATUS_LABELS[order.status] || {
                        label: order.status,
                        color: "text-gray-400 bg-gray-400/10",
                    };
                    return (
                        <div
                            key={order._id.toString()}
                            className="bg-gray-900 rounded-2xl p-5 border border-gray-800"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <p className="text-white font-medium">
                                        Pedido #
                                        {order._id
                                            .toString()
                                            .slice(-6)
                                            .toUpperCase()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(
                                            order.createdAt,
                                        ).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                                <span
                                    className={`text-xs font-medium px-3 py-1 rounded-full ${status.color}`}
                                >
                                    {status.label}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                {order.lineItems.map((item: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex justify-between text-sm"
                                    >
                                        <span className="text-gray-400">
                                            {item.name} x{item.quantity}
                                        </span>
                                        <span className="text-white">
                                            $
                                            {item.total.toLocaleString("es-AR")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-700 pt-3 flex justify-between">
                                <span className="text-sm text-gray-400">
                                    Total
                                </span>
                                <span className="text-white font-bold">
                                    ${order.total.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
