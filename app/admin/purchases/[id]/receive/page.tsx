import { getPurchasesById } from "@/lib/purchases/getPurchasesById";
import { ReceivePurchaseForm } from "@/components/admin/ReceivePurchaseForm";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const purchase = await getPurchasesById(id, true);

    if (!purchase) {
        return <div className="text-white">Compra no encontrada</div>;
    }

    if (purchase.status === "received") {
        return <div className="text-white">Compra ya recepcionada</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">
                Recepcionar compra
            </h1>

            <ReceivePurchaseForm purchase={purchase} />
        </div>
    );
}
