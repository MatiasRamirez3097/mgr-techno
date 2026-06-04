"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Props = {
    pendingReviewCount: number;
};

const LINKS = [
    {
        href: "/admin/orders",
        label: "Órdenes",
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
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                />
            </svg>
        ),
    },
    {
        href: "/admin/products",
        label: "Productos",
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
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
            </svg>
        ),
        children: [
            {
                href: "/admin/products?status=pending_review",
                label: "Pendientes revisión",
            },
        ],
    },
    {
        href: "/admin/customers",
        label: "Clientes",
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
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
            </svg>
        ),
    },
    {
        href: "/admin/purchases",
        label: "Compras",
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
                    d="M2.25 3h1.386a1.125 1.125 0 011.09.863L5.61 7.5m0 0h13.64a1.125 1.125 0 001.09-.863l1.125-4.5H5.61zm0 0l1.5 7.5m0 0A1.125 1.125 0 008.215 18h8.57a1.125 1.125 0 001.105-.863L19.5 9.75M9 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm9 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                />
            </svg>
        ),
    },
];

export function AdminSidebar({ pendingReviewCount }: Props) {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("admin-sidebar-collapsed");

        if (saved) {
            setCollapsed(saved === "true");
        }
    }, []);

    const toggleSidebar = () => {
        const next = !collapsed;

        setCollapsed(next);
        localStorage.setItem("admin-sidebar-collapsed", String(next));
    };

    const pathname = usePathname();
    const searchParams = useSearchParams();

    return (
        <aside
            className={`relative bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen shrink-0 transition-all duration-300 ${
                collapsed ? "w-20" : "w-60"
            }`}
        >
            <button
                onClick={toggleSidebar}
                className="
        absolute
        -right-3
        top-8
        z-50
        flex
        h-6
        w-6
        items-center
        justify-center
        rounded-full
        border
        border-gray-700
        bg-gray-900
        text-gray-400
        shadow-lg
        transition-all
        hover:text-white
        hover:border-gray-500
    "
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        collapsed ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </button>
            {/* Header */}
            <div
                className={`border-b border-gray-800 p-4 flex items-center ${
                    collapsed ? "justify-center" : "justify-between"
                }`}
            >
                {collapsed ? (
                    <Link
                        href="/admin"
                        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10"
                    >
                        <span className="text-brand font-bold text-lg">M</span>
                    </Link>
                ) : (
                    <div>
                        <Link href="/admin" className="text-lg font-bold">
                            <span className="text-white">MGR</span>
                            <span className="text-brand">TECHNO</span>
                        </Link>

                        <p className="text-xs text-gray-500 mt-0.5">
                            Panel de administración
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                {LINKS.map((link) => {
                    const isActive =
                        pathname === link.href ||
                        pathname.startsWith(`${link.href}/`);

                    return (
                        <div key={link.href} className="relative group">
                            <Link
                                href={link.href}
                                className={`flex items-center ${
                                    collapsed ? "justify-center" : "gap-3"
                                } px-4 py-2.5 rounded-xl text-sm transition-colors ${
                                    isActive
                                        ? "bg-brand text-white font-medium"
                                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                            >
                                {link.icon}

                                {!collapsed && <span>{link.label}</span>}

                                {collapsed &&
                                    link.href === "/admin/products" &&
                                    pendingReviewCount > 0 && (
                                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-500 px-1 text-[9px] font-bold text-black">
                                            {pendingReviewCount}
                                        </span>
                                    )}
                            </Link>

                            {collapsed && (
                                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    {link.label}
                                </span>
                            )}

                            {!collapsed &&
                                link.children?.map((child) => {
                                    const childActive =
                                        child.href.includes(
                                            "status=pending_review",
                                        ) &&
                                        pathname === "/admin/products" &&
                                        searchParams.get("status") ===
                                            "pending_review";

                                    return (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={`ml-8 mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                                                childActive
                                                    ? "bg-gray-800 text-yellow-400"
                                                    : "text-gray-500 hover:text-white"
                                            }`}
                                        >
                                            <span>⚠</span>

                                            <span>{child.label}</span>

                                            {pendingReviewCount > 0 && (
                                                <span className="ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-yellow-500 text-black text-[10px] font-bold">
                                                    {pendingReviewCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-800 flex flex-col gap-2">
                <Link
                    href="/"
                    className={`flex items-center ${
                        collapsed ? "justify-center" : "gap-3"
                    } px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors`}
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
                            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35"
                        />
                    </svg>

                    {!collapsed && <span>Ver tienda</span>}
                </Link>

                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={`flex items-center ${
                        collapsed ? "justify-center" : "gap-3"
                    } px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors`}
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
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
                        />
                    </svg>

                    {!collapsed && <span>Cerrar sesión</span>}
                </button>
            </div>
        </aside>
    );
}
