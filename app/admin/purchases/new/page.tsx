import { connectDB } from "@/lib/mongodb";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import Link from "next/link";

export default async function AdminNewPurchasePage() {
    await connectDB();

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/purchases"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">Nueva compra</h1>
            </div>
            <PurchaseForm mode="create" />
        </div>
    );
}
