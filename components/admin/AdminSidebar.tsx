"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

type Props = {
    pendingReviewCount: number;
    pendingSalesCount: number;
};

type SidebarChild = {
    href: string;
    label: string;
    pendingReviewBadge?: boolean;
    // Contador de ventas escaneadas sin formalizar
    pendingSalesBadge?: boolean;
};

const LINKS = [
    {
        href: "/admin/dashboard",
        label: "Dashboard",
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
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
            </svg>
        ),
    },
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
        href: "/admin/scan",
        label: "Escanear venta",
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
                    d="M3.75 7.5V5.25A1.5 1.5 0 015.25 3.75H7.5m9 0h2.25a1.5 1.5 0 011.5 1.5V7.5m0 9v2.25a1.5 1.5 0 01-1.5 1.5H16.5m-9 0H5.25a1.5 1.5 0 01-1.5-1.5V16.5M7.5 8.25v7.5m3-7.5v7.5m3-7.5v7.5m3-7.5v7.5"
                />
            </svg>
        ),
        children: [
            {
                href: "/admin/pending-sales",
                label: "Ventas escaneadas",
                pendingSalesBadge: true,
            },
        ],
    },
    {
        href: "/admin/quotes",
        label: "Presupuestos",
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
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
                // Muestra ⚠ y el contador de productos pendientes de revisión
                pendingReviewBadge: true,
            },
            {
                href: "/admin/inventory/rotation",
                label: "Stock a rotar",
            },
        ],
    },
    {
        href: "/admin/categories",
        label: "Categorías",
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
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6h.008v.008H6V6z"
                />
            </svg>
        ),
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
    {
        href: "/admin/comparator",
        label: "Precios Distribuidores",
        children: [
            {
                href: "/admin/comparator/categories",
                label: "Categorías",
            },
            {
                href: "/admin/comparator/pricing",
                label: "Revisión de precios",
            },
            {
                href: "/admin/comparator/margins",
                label: "Márgenes",
            },
        ],
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
                    d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                />
            </svg>
        ),
    },
    {
        href: "/admin/daily-deals",
        label: "Ofertas del día",
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
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
        ),
    },
    {
        href: "/admin/hero",
        label: "Banners home",
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
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
            </svg>
        ),
    },
    {
        href: "/admin/settings",
        label: "Configuración",
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
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                />
            </svg>
        ),
    },
];

export function AdminSidebar({ pendingReviewCount, pendingSalesCount }: Props) {
    const badgeCountFor = (child: SidebarChild) =>
        child.pendingReviewBadge ? pendingReviewCount : child.pendingSalesBadge ? pendingSalesCount : 0;

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

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

    // Cerrar sidebar móvil en cambio de ruta
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname, searchParams]);

    // Con el menú del celular abierto: sin scroll de fondo y Escape lo cierra
    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [mobileOpen]);

    const renderChild = (child: SidebarChild, inline: boolean) => {
        const isPendingReview = Boolean(child.pendingReviewBadge);
        const childActive = isPendingReview
            ? pathname === "/admin/products" &&
              searchParams.get("status") === "pending_review"
            : pathname === child.href || pathname.startsWith(`${child.href}/`);

        return (
            <Link
                key={child.href}
                href={child.href}
                onClick={() => setMobileOpen(false)}
                className={`${inline ? "ml-8 mt-0.5" : ""} flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-xs transition-colors ${
                    childActive
                        ? `bg-gray-800 font-medium ${isPendingReview ? "text-yellow-400" : "text-white"}`
                        : `${inline ? "text-gray-500" : "text-gray-300"} hover:text-white hover:bg-gray-800`
                }`}
            >
                {isPendingReview && <span>⚠</span>}
                <span>{child.label}</span>

                {isPendingReview && pendingReviewCount > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-yellow-500 text-black text-[10px] font-bold">
                        {pendingReviewCount}
                    </span>
                )}

                {child.pendingSalesBadge && pendingSalesCount > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-yellow-500 text-black text-[10px] font-bold">
                        {pendingSalesCount}
                    </span>
                )}
            </Link>
        );
    };

    const renderNavContent =(isMobileDrawer: boolean) => (
        <>
            {/* Header */}
            <div
                className={`border-b border-gray-800 p-4 flex items-center ${
                    !isMobileDrawer && collapsed ? "justify-center" : "justify-between"
                }`}
            >
                {!isMobileDrawer && collapsed ? (
                    <Link
                        href="/admin/dashboard"
                        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10"
                    >
                        <span className="text-brand font-bold text-lg">M</span>
                    </Link>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <Link href="/admin/dashboard" className="text-lg font-bold">
                                <span className="text-white">MGR</span>
                                <span className="text-brand">TECHNO</span>
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Panel de administración
                            </p>
                        </div>
                        {isMobileDrawer && (
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                                aria-label="Cerrar menú"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Links.
                En escritorio no scrollea (así los submenús flotantes no quedan recortados):
                los submenús sólo se despliegan en línea en la sección actual; el resto aparece
                a la derecha al pasar el mouse. Sólo en pantallas muy bajas vuelve a scrollear. */}
            <nav
                className={`flex-1 min-h-0 px-3 py-4 flex flex-col gap-0.5 ${
                    isMobileDrawer
                        ? "overflow-y-auto"
                        : "[@media(max-height:620px)]:overflow-y-auto"
                }`}
            >
                {LINKS.map((link) => {
                    const isActive =
                        pathname === link.href ||
                        pathname.startsWith(`${link.href}/`) ||
                        // Hijos fuera de la ruta del padre (ej: /admin/pending-sales bajo /admin/scan)
                        (link.children ?? []).some((c) => pathname === c.href.split("?")[0]);
                    const isCollapsedDesktop = !isMobileDrawer && collapsed;
                    const children: SidebarChild[] = link.children ?? [];
                    const showInline =
                        children.length > 0 && !isCollapsedDesktop && (isMobileDrawer || isActive);
                    const showFlyout = children.length > 0 && !isMobileDrawer && !showInline;
                    // Si el hijo con contador no está a la vista, el contador va en el padre
                    const parentBadgeCount = showInline
                        ? 0
                        : children.reduce((acc, c) => acc + badgeCountFor(c), 0);
                    const parentBadge = parentBadgeCount > 0;

                    return (
                        <div key={link.href} className="relative group">
                            <Link
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center ${
                                    isCollapsedDesktop ? "justify-center" : "gap-3"
                                } px-4 py-2 rounded-xl text-sm transition-colors ${
                                    isActive
                                        ? "bg-brand text-white font-medium shadow-sm"
                                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                            >
                                {link.icon}

                                {!isCollapsedDesktop && <span>{link.label}</span>}

                                {parentBadge &&
                                    (isCollapsedDesktop ? (
                                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-500 px-1 text-[9px] font-bold text-black">
                                            {parentBadgeCount}
                                        </span>
                                    ) : (
                                        <span className="ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-yellow-500 text-black text-[10px] font-bold">
                                            {parentBadgeCount}
                                        </span>
                                    ))}

                                {!isCollapsedDesktop && showFlyout && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`${parentBadge ? "" : "ml-auto"} h-3.5 w-3.5 shrink-0 opacity-50`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </Link>

                            {/* Tooltip hover en modo colapsado (secciones sin submenú) */}
                            {isCollapsedDesktop && children.length === 0 && (
                                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 border border-gray-700 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                    {link.label}
                                </span>
                            )}

                            {/* Submenú flotante a la derecha. El pl hace de puente para no perder el hover */}
                            {showFlyout && (
                                <div className="invisible absolute left-full top-0 z-50 pl-4 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                                    <div className="min-w-52 rounded-xl border border-gray-700 bg-gray-900 p-1.5 shadow-xl">
                                        <Link
                                            href={link.href}
                                            className="block whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white"
                                        >
                                            {link.label}
                                        </Link>
                                        {children.map((child) => renderChild(child, false))}
                                    </div>
                                </div>
                            )}

                            {showInline && children.map((child) => renderChild(child, true))}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-800 flex flex-col gap-2 shrink-0">
                <Link
                    href="/"
                    className={`flex items-center ${
                        !isMobileDrawer && collapsed ? "justify-center" : "gap-3"
                    } px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors`}
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
                    {(!collapsed || isMobileDrawer) && <span>Ver tienda</span>}
                </Link>

                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={`flex items-center ${
                        !isMobileDrawer && collapsed ? "justify-center" : "gap-3"
                    } px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors`}
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
                    {(!collapsed || isMobileDrawer) && <span>Cerrar sesión</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Header móvil superior */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 z-40 px-4 flex items-center justify-between">
                <Link href="/admin/dashboard" className="text-lg font-bold">
                    <span className="text-white">MGR</span>
                    <span className="text-brand">TECHNO</span>
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800"
                    aria-label="Abrir menú"
                    aria-expanded={mobileOpen}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                        />
                    </svg>
                </button>
            </div>

            {/* Backdrop para Drawer móvil */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Drawer móvil */}
            <aside
                aria-hidden={!mobileOpen}
                className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-gray-900 border-r border-gray-800 z-50 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {renderNavContent(true)}
            </aside>

            {/* Sidebar Desktop fijo */}
            <aside
                // Pegada al costado: no se va con el scroll en páginas largas
                className={`hidden md:flex sticky top-0 z-30 h-screen bg-gray-900 border-r border-gray-800 flex-col shrink-0 transition-all duration-300 ${
                    collapsed ? "w-20" : "w-60"
                }`}
            >
                <button
                    onClick={toggleSidebar}
                    className="
                        absolute
                        -right-3
                        top-8
                        z-30
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
                    aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
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

                {renderNavContent(false)}
            </aside>
        </>
    );
}
