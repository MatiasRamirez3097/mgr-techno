import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
    const session = await getServerSession(authOptions);

    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold text-white mb-8">Checkout</h1>
            <CheckoutForm session={session} />
        </main>
    );
}

export const dynamic = "force-dynamic";
