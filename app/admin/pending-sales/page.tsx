import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { buttonClass } from "@/components/admin/ui/styles";
import { PendingSalesInbox } from "@/components/admin/scan/PendingSalesInbox";
import { getPendingSalesInbox } from "@/services/pendingSales/getPendingSalesInbox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ventas escaneadas" };

export default async function PendingSalesPage() {
    const { pending, history } = await getPendingSalesInbox();

    return (
        <div className="max-w-4xl">
            <AdminPageHeader
                title="Ventas escaneadas"
                description="Ventas registradas con el celular que todavía no tienen pedido. Elegí una o varias del mismo cliente y creá el pedido."
                actions={
                    <Link href="/admin/scan" className={buttonClass.secondary}>
                        Escanear venta
                    </Link>
                }
            />
            <PendingSalesInbox pending={pending} history={history} />
        </div>
    );
}
