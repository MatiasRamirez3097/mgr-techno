"use client";

import Link from "next/link";

import { RegenerateVoucherPdfButton } from "./documents/RegenerateVoucherPdfButton";

interface Props {
    orderId: string;

    voucher: any;
}

export function VoucherCard({ orderId, voucher }: Props) {
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
                        {new Date(voucher.generatedAt).toLocaleString("es-AR")}
                    </div>
                </div>

                <div
                    className={`
                        text-xs
                        px-2 py-1
                        rounded-lg
                        border
                        ${
                            voucher.status === "issued"
                                ? `
                                bg-green-500/10
                                text-green-300
                                border-green-500/20
                                `
                                : `
                                bg-yellow-500/10
                                text-yellow-300
                                border-yellow-500/20
                                `
                        }
                    `}
                >
                    {voucher.status}
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <Link
                    href={`/api/admin/vouchers/${voucher.id}/download`}
                    target="_blank"
                    className="
                        flex-1
                        text-center
                        px-4 py-2
                        rounded-xl
                        bg-blue-500/10
                        border border-blue-500/20
                        text-blue-300
                        hover:bg-blue-500/20
                        transition-colors
                        text-sm
                    "
                >
                    Ver PDF
                </Link>

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
