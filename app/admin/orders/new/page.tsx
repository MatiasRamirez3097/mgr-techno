import { connectDB } from "@/lib/mongodb";
import { OrderForm } from "@/components/admin/OrderForm";
import Link from "next/link";

export default async function AdminNewOrderPage() {
    await connectDB();

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/orders"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">Nueva Venta</h1>
            </div>
            <OrderForm mode="create" />
        </div>
    );
}
