"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LoginModal } from "@/components/LoginModal"; // Ajustá esta ruta según dónde guardaste el modal

export function UserMenu() {
    const { data: session, status } = useSession();

    // Estados para el Modal y el Dropdown
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Referencia para detectar clics fuera del dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar el dropdown al hacer clic afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (status === "loading")
        return (
            <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse"></div>
        );

    // ==========================================
    // USUARIO NO AUTENTICADO
    // ==========================================
    if (!session) {
        return (
            <>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm px-4 py-2 rounded-xl bg-brand text-white hover:brightness-110 transition-all font-medium"
                >
                    Ingresar
                </button>

                <LoginModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            </>
        );
    }

    // ==========================================
    // USUARIO AUTENTICADO
    // ==========================================
    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón / Avatar del usuario */}
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700"
            >
                <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 text-gray-300">
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                </div>
                <span className="text-sm text-gray-200 hidden sm:block font-medium pr-2">
                    {session.user?.name?.split(" ")[0]}
                </span>
            </button>

            {/* Menú Desplegable */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Cabecera del Dropdown */}
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                        <p className="text-sm text-white font-medium truncate">
                            {session.user?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                            {session.user?.email}
                        </p>
                    </div>

                    {/* Opciones */}
                    <div className="p-2 flex flex-col gap-1">
                        <Link
                            href="/mi-cuenta/ordenes"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                        >
                            <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                            </svg>
                            Mis pedidos
                        </Link>

                        <Link
                            href="/mi-cuenta/perfil"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                        >
                            <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                />
                            </svg>
                            Mis datos
                        </Link>
                    </div>

                    {/* Botón Salir */}
                    <div className="p-2 border-t border-gray-800">
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Salir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
