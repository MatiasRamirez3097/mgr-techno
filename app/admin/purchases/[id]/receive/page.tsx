import { getPurchasesById } from "@/lib/purchases/getPurchasesById";
import { ReceivePurchaseForm } from "@/components/admin/ReceivePurchaseForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const purchase = await getPurchasesById(id, true);

    if (!purchase) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href={`/admin/purchases/${purchase.id}`}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver al detalle
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Recepcionar mercadería
                </h1>
            </div>

            {purchase.status === "received" ? (
                <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <h2 className="text-lg font-bold text-white mb-2">
                        Compra completamente recepcionada
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Todos los productos de esta orden ya han ingresado al inventario.
                    </p>
                    <Link
                        href={`/admin/purchases/${purchase.id}`}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition"
                    >
                        Ver detalle de compra
                    </Link>
                </div>
            ) : purchase.status === "draft" ? (
                <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h2 className="text-lg font-bold text-white mb-2">
                        Compra en estado Borrador
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Para poder recepcionar mercadería, primero debes confirmar la compra.
                    </p>
                    <Link
                        href={`/admin/purchases/${purchase.id}`}
                        className="px-5 py-2.5 bg-brand hover:brightness-110 text-white rounded-xl text-sm transition"
                    >
                        Ir a editar y confirmar
                    </Link>
                </div>
            ) : purchase.status === "cancelled" ? (
                <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">🚫</div>
                    <h2 className="text-lg font-bold text-white mb-2">
                        Compra Cancelada
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Esta compra fue cancelada y no admite recepción de mercadería.
                    </p>
                    <Link
                        href={`/admin/purchases`}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition"
                    >
                        Volver a compras
                    </Link>
                </div>
            ) : (
                <ReceivePurchaseForm purchase={purchase} />
            )}
        </div>
    );
}
