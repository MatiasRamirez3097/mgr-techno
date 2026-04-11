"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Session } from "next-auth";

const LINKS = [
    {
        href: "/account/orders",
        label: "Mis pedidos",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
            </svg>
        ),
    },
    {
        href: "/account/profile",
        label: "Mis datos",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
            </svg>
        ),
    },
    {
        href: "/account/password",
        label: "Cambiar contraseña",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
            </svg>
        ),
    },
];

export function AccountSidebar({ session }: { session: Session }) {
    const pathname = usePathname();

    return (
        <aside className="flex flex-col gap-2">
            {/* Avatar y nombre */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-2">
                <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-bold text-lg mb-3">
                    {session.user?.name?.charAt(0).toUpperCase()}
                </div>
                <p className="text-white font-medium text-sm">
                    {session.user?.name}
                </p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">
                    {session.user?.email}
                </p>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-1">
                {LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                            pathname === link.href
                                ? "bg-brand text-white font-medium"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                    >
                        {link.icon}
                        {link.label}
                    </Link>
                ))}

                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors mt-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                        />
                    </svg>
                    Cerrar sesión
                </button>
            </nav>
        </aside>
    );
}
