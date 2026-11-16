import { connectDB } from "@/lib/mongodb";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import { notFound } from "next/navigation";
import type { PurchaseDTO } from "@/types/shared/purchase";
import { getPurchasesById } from "@/services/purchases/getPurchasesById";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminEditPurchasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const purchase: PurchaseDTO | null = await getPurchasesById(id);

    if (!purchase) notFound();

    const isReadOnly =
        purchase.status === "received" ||
        purchase.status === "partially_received" ||
        purchase.status === "cancelled";

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/purchases", label: "Compras" }}
                title={<>{isReadOnly ? "Detalle de compra" : "Editar compra"}</>}
            />
            <PurchaseForm purchase={purchase} mode="edit" />
        </div>
    );
}
