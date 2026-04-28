import { connectDB } from "@/lib/mongodb";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PurchaseDTO } from "@/types/shared/purchase";
import { getPurchasesById } from "@/lib/purchases/getPurchasesById";

export const dynamic = "force-dynamic";

export default async function AdminEditPurchasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const purchase: PurchaseDTO[] | null = await Promise.all([
        getPurchasesById(id),
    ]);

    if (!purchase) notFound();

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/purchases"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">Editar compra</h1>
            </div>
            <PurchaseForm product={purchase} mode="edit" />
        </div>
    );
}
