import { connectDB } from "@/lib/mongodb";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default async function AdminNewPurchasePage() {
    await connectDB();

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/purchases", label: "Compras" }}
                title="Nueva compra"
            />
            <PurchaseForm mode="create" />
        </div>
    );
}
