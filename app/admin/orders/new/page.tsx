import { connectDB } from "@/lib/mongodb";
import { OrderForm } from "@/components/admin/OrderForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default async function AdminNewOrderPage() {
    await connectDB();

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/orders", label: "Órdenes" }}
                title="Nueva Venta"
            />
            <OrderForm mode="create" />
        </div>
    );
}
