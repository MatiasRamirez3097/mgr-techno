"use client";

interface Props {
    voucherId: string;
}

export function DownloadVoucherButton({ voucherId }: Props) {
    return (
        <a
            href={`/api/admin/vouchers/${voucherId}/download`}
            target="_blank"
            className="
                px-3 py-2
                rounded-lg
                bg-blue-600
                hover:bg-blue-500
                text-white
                text-sm
                transition-colors
            "
        >
            Descargar PDF
        </a>
    );
}
