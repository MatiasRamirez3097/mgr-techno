import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { ScanSaleScreen } from "@/components/admin/scan/ScanSaleScreen";

export const metadata: Metadata = { title: "Escanear venta" };

export default function ScanSalePage() {
    return (
        <div>
            <AdminPageHeader
                title="Escanear venta"
                description="Escaneá el código de barras del producto vendido: queda como venta pendiente y reserva el stock hasta que se cargue el pedido."
            />
            <ScanSaleScreen />
        </div>
    );
}
