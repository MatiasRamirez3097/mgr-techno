import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getPendingReviewCount } from "@/services/products/getPendingReviewCount";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login?next=/admin");

    // Solo administradores
    if ((session as any).role !== "administrator") redirect("/");

    const pendingReviewCount = await getPendingReviewCount();

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
            <AdminSidebar pendingReviewCount={pendingReviewCount} />
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto pt-20 md:pt-8">{children}</main>
        </div>
    );
}

export const dynamic = "force-dynamic";
