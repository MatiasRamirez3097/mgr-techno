import { getStoreSettings } from "@/services/settings/getStoreSettings";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default async function AdminSettingsPage() {
    const settings = await getStoreSettings();

    return (
        <div className="max-w-2xl">
            <AdminPageHeader title="Configuración" />
            <StoreSettingsForm initialSettings={settings} />
        </div>
    );
}
