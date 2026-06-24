"use client";

import Link from "next/link";

import { RegenerateVoucherPdfButton } from "./documents/RegenerateVoucherPdfButton";
import { SendVoucherEmailButton } from "./SendVoucherEmailButton";
import { DownloadPdfButton } from "./orders/DownloadPdfButton";

interface Props {
    orderId: string;
    voucher: any;
}

export function VoucherCard({ orderId, voucher }: Props) {
    // Incorporamos la lógica de traducción de estado que charlamos antes
    const isIssued = voucher.status === "issued";
    const statusLabel = isIssued
        ? "Autorizada"
        : voucher.status === "cancelled"
          ? "Anulada"
          : voucher.status === "replaced"
            ? "Reemplazada"
            : "Borrador";

    // Armamos un nombre de archivo prolijo dependiendo del tipo de comprobante
    const fileName =
        voucher.type === "fiscal_invoice"
            ? `Factura_${voucher.fiscalData?.fiscalType}-${String(voucher.voucherNumber || voucher.number).padStart(8, "0")}.pdf`
            : `Comprobante_${voucher.number}.pdf`;

    // Priorizamos la URL directa si existe, sino usamos el endpoint de descarga
    const downloadUrl =
        voucher.pdfUrl || `/api/admin/vouchers/${voucher.id}/download`;

    return (
        <div
            className="
                border border-gray-800
                rounded-xl
                p-4
                bg-black/30
            "
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-white">
                        {getVoucherTitle(voucher)}
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                        Nº {voucher.number}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                        {new Date(
                            voucher.generatedAt || Date.now(),
                        ).toLocaleString("es-AR")}
                    </div>
                </div>

                <div
                    className={`
                        text-xs
                        px-2 py-1
                        rounded-lg
                        border
                        ${
                            isIssued
                                ? `bg-green-500/10 text-green-300 border-green-500/20`
                                : `bg-yellow-500/10 text-yellow-300 border-yellow-500/20`
                        }
                    `}
                >
                    {statusLabel}
                </div>
            </div>

            {/* Agregamos flex-wrap por si los 3 botones no entran en pantallas pequeñas */}
            <div className="flex flex-wrap gap-2 mt-4">
                {/* Envolvemos nuestro DownloadPdfButton para que herede el estilo de la tarjeta original */}
                <div
                    className="
                        flex-1
                        flex items-center justify-center
                        rounded-xl
                        bg-blue-500/10
                        border border-blue-500/20
                        hover:bg-blue-500/20
                        transition-colors
                        [&>button]:mt-0 [&>button]:text-blue-300 [&>button]:py-2 [&>button]:px-4
                    "
                >
                    <DownloadPdfButton url={downloadUrl} fileName={fileName} />
                </div>

                <SendVoucherEmailButton
                    orderId={orderId}
                    voucherId={voucher.id}
                />

                <RegenerateVoucherPdfButton
                    orderId={orderId}
                    voucherId={voucher.id}
                />
            </div>
        </div>
    );
}

function getVoucherTitle(voucher: any) {
    switch (voucher.type) {
        case "fiscal_invoice":
            return `Factura ${voucher.fiscalData?.fiscalType || ""}`;

        case "credit_note":
            return "Nota de crédito";

        case "debit_note":
            return "Nota de débito";

        default:
            return "Comprobante";
    }
}
