import { getStoreSettings } from "@/services/settings/getStoreSettings";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { DistributorSettingsForm } from "@/components/admin/DistributorSettingsForm";
import { RotationSettingsForm } from "@/components/admin/rotation/RotationSettingsForm";
import { getDistributorSettings } from "@/services/settings/getDistributorSettings";
import { getRotationSettings } from "@/services/settings/getRotationSettings";
import { AnalyticsSettingsForm } from "@/components/admin/analytics/AnalyticsSettingsForm";
import { getAnalyticsSettings } from "@/services/settings/getAnalyticsSettings";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default async function AdminSettingsPage() {
    const [settings, distributorSettings, rotationSettings, analyticsSettings] = await Promise.all([
        getStoreSettings(),
        getDistributorSettings(),
        getRotationSettings(),
        getAnalyticsSettings(),
    ]);

    return (
        <div className="max-w-2xl">
            <AdminPageHeader title="Configuración" />
            <div className="flex flex-col gap-6">
                <StoreSettingsForm initialSettings={settings} />
                <DistributorSettingsForm initialSettings={distributorSettings} />
                <RotationSettingsForm initialSettings={rotationSettings} />
                <AnalyticsSettingsForm initialSettings={analyticsSettings} />
            </div>
        </div>
    );
}
