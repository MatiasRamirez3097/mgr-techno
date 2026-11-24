import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getPendingReviewCount } from "@/services/products/getPendingReviewCount";
import { getStoreSettings } from "@/services/settings/getStoreSettings";
import { countPendingSales } from "@/services/pendingSales/countPendingSales";
import { StoreSettingsProvider } from "@/components/providers/StoreSettingsProvider";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login?next=/admin");

    // Solo administradores
    if ((session as any).role !== "administrator") redirect("/");

    const [pendingReviewCount, settings, pendingSalesCount] = await Promise.all([
        getPendingReviewCount(),
        getStoreSettings(),
        countPendingSales(),
    ]);

    return (
        <StoreSettingsProvider settings={settings}>
            <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
                <AdminSidebar
                    pendingReviewCount={pendingReviewCount}
                    pendingSalesCount={pendingSalesCount}
                />
                {/* min-w-0: que una tabla ancha no estire la página (scrollea su contenedor);
                    sin overflow propio para que funcionen los elementos sticky (índice, barra de guardar) */}
                <main className="flex-1 min-w-0 px-4 pb-6 pt-20 sm:px-6 md:p-8">
                    <div className="mx-auto w-full max-w-[1600px]">{children}</div>
                </main>
            </div>
        </StoreSettingsProvider>
    );
}

export const dynamic = "force-dynamic";
