import { getStoreSettings } from "@/services/settings/getStoreSettings";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";

export default async function AdminSettingsPage() {
    const settings = await getStoreSettings();

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-6">
                Configuración
            </h1>
            <StoreSettingsForm initialSettings={settings} />
        </div>
    );
}
