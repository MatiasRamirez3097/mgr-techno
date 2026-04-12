import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login?next=/admin");

    // Solo administradores
    if ((session as any).role !== "administrator") redirect("/");

    return (
        <div className="min-h-screen bg-gray-950 flex">
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
    );
}
