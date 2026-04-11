import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AccountSidebar } from "@/components/account/AccountSidebar";

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login?next=/account/orders");

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <AccountSidebar session={session} />
                <div className="lg:col-span-3">{children}</div>
            </div>
        </main>
    );
}
