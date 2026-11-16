"use client";
import React, { useState } from "react";
import type { NormalizedProduct } from "@/types/shared/distributor";
import { distributorItemKey, type LinkedProductRef } from "@/lib/distributors/productLinks";
import { LinkToProductButton } from "./LinkToProductButton";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";

const BADGE_STYLES: Record<string, { pill: string; solid: string }> = {
    Elit: {
        pill: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        solid: "bg-blue-600 text-white",
    },
    INVID: {
        pill: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
        solid: "bg-purple-600 text-white",
    },
    AIR: {
        pill: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
        solid: "bg-orange-600 text-white",
    },
};
const DEFAULT_BADGE = {
    pill: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    solid: "bg-emerald-600 text-white",
};
const badgeFor = (distributor: string) =>
    BADGE_STYLES[distributor] || DEFAULT_BADGE;

// Invid puede informar sólo una leyenda ("Stock bajo") en lugar de cantidades;
// AIR informa "Sin stock en ROS (...)" cuando sólo hay en otros depósitos
const stockText = (prod: NormalizedProduct) =>
    prod.stockLabel || (prod.stock > 0 ? `${prod.stock} un.` : "Sin stock");
const hasStock = (prod: NormalizedProduct) =>
    prod.stock > 0 || Boolean(prod.stockLabel && !/^sin stock/i.test(prod.stockLabel));

interface Props {
    products: NormalizedProduct[];
    search: string;
    // Productos propios vinculados a cada resultado (clave distributorItemKey)
    linkedProducts?: Record<string, LinkedProductRef[]>;
}

export const DistributorsTable = ({ products, search, linkedProducts = {} }: Props) => {
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");

    return (
        <div className="w-full flex flex-col">
            {/* VIEW TOGGLE CONTROLS */}
            <div className="flex justify-end p-4 border-b border-gray-800 bg-gray-800/20">
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("table")}
                        className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-gray-700 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                        title="Vista de tabla"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-gray-700 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                        title="Vista de catálogo"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                    {search
                        ? "No se encontraron resultados para esta búsqueda."
                        : "Utilizá la barra de búsqueda o los filtros para consultar productos."}
                </div>
            ) : (
                <>
                    {/* ========================= */}
                    {/* TABLE VIEW */}
                    {/* ========================= */}
                    {viewMode === "table" && (
                        <ResponsiveTable
                            variant="bare"
                            rows={products}
                            getRowKey={(prod) => `${prod.distributor}-${prod.id}`}
                            minWidth="960px"
                            columns={[
                                {
                                    key: "distributor",
                                    header: "Distribuidor",
                                    mobile: "badge",
                                    cell: (prod) => (
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${badgeFor(prod.distributor).pill}`}
                                        >
                                            {prod.distributor}
                                        </span>
                                    ),
                                },
                                {
                                    key: "sku",
                                    header: "SKU",
                                    mobile: "subtitle",
                                    className: "text-sm text-gray-400",
                                    cell: (prod) => <span className="font-mono">{prod.sku}</span>,
                                },
                                {
                                    key: "image",
                                    header: "",
                                    mobile: "media",
                                    desktop: false,
                                    cell: (prod) => <ProductImage prod={prod} />,
                                },
                                {
                                    key: "product",
                                    header: "Producto",
                                    mobile: "title",
                                    headerClassName: "min-w-[300px]",
                                    className: "font-medium text-gray-200",
                                    cell: (prod) => (
                                        <div className="flex items-center gap-4">
                                            <span className="hidden md:block">
                                                <ProductImage prod={prod} />
                                            </span>
                                            <span className="line-clamp-2" title={prod.name}>
                                                {prod.name}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    key: "stock",
                                    header: "Stock",
                                    cell: (prod) => (
                                        <span className={hasStock(prod) ? "text-emerald-400" : "text-red-400"}>
                                            {stockText(prod)}
                                        </span>
                                    ),
                                },
                                {
                                    key: "price",
                                    header: "Precio",
                                    className: "font-bold text-white whitespace-nowrap",
                                    cell: (prod) =>
                                        `$${prod.price.toLocaleString("es-AR", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}`,
                                },
                                {
                                    key: "link",
                                    header: "Enlace",
                                    align: "center",
                                    mobile: "actions",
                                    cell: (prod) =>
                                        prod.link ? (
                                            <a
                                                href={prod.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                title="Ver en el sitio del distribuidor"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                </svg>
                                                <span className="text-xs md:hidden">Ver</span>
                                            </a>
                                        ) : (
                                            <span className="hidden md:inline text-gray-600">-</span>
                                        ),
                                },
                                {
                                    key: "linked",
                                    header: "Tu producto",
                                    mobile: "actions",
                                    cell: (prod) => (
                                        <LinkToProductButton
                                            item={prod}
                                            linkedProducts={linkedProducts[distributorItemKey(prod.distributor, prod.id)] ?? []}
                                        />
                                    ),
                                },
                            ]}
                        />
                    )}

                    {/* CATALOG / GRID VIEW */}
                    {/* ========================= */}
                    {viewMode === "grid" && (
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.map((prod) => (
                                <div
                                    key={`${prod.distributor}-${prod.id}`}
                                    className="bg-gray-800/40 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all flex flex-col"
                                >
                                    <div className="w-full h-48 bg-gray-900 flex items-center justify-center p-4 relative border-b border-gray-800">
                                        <div className="absolute top-3 left-3">
                                            <span
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeFor(prod.distributor).solid}`}
                                            >
                                                {prod.distributor}
                                            </span>
                                        </div>
                                        {prod.image ? (
                                            <img
                                                src={prod.image} alt={prod.name} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <svg
                                                className="w-12 h-12 text-gray-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        )}
                                    </div>

                                    <div className="p-5 flex flex-col flex-1 gap-3">
                                        <span className="text-xs text-gray-500 font-mono">
                                            SKU: {prod.sku}
                                        </span>
                                        <h3
                                            className="text-sm font-medium text-gray-200 line-clamp-2 h-10"
                                            title={prod.name}
                                        >
                                            {prod.name}
                                        </h3>

                                        <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-700/50">
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-xs font-medium ${hasStock(prod) ? "text-emerald-400" : "text-red-400"}`}
                                                >
                                                    {stockText(prod)}
                                                </span>
                                                <span className="text-lg font-bold text-white">
                                                    $
                                                    {prod.price.toLocaleString(
                                                        "es-AR",
                                                        {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        },
                                                    )}
                                                </span>
                                            </div>

                                            {prod.link && (
                                                <a
                                                    href={prod.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                                                >
                                                    Ver en distribuidor
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                        />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function ProductImage({ prod }: { prod: NormalizedProduct }) {
    return (
        <div className="w-12 h-12 shrink-0 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden">
            {prod.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={prod.image}
                    alt={prod.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1"
                />
            ) : (
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            )}
        </div>
    );
}
