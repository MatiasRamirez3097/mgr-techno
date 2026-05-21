"use client";

export function DownloadReceiptButton({ orderId }: { orderId: string }) {
    async function handleDownload() {
        const response = await fetch(
            `/api/admin/orders/${orderId}/receipt/url`,
        );

        const data = await response.json();

        if (!data.success) {
            alert(data.error);
            return;
        }

        window.open(data.url, "_blank");
    }

    return (
        <button
            onClick={handleDownload}
            className="
                px-4 py-2
                rounded-lg
                bg-white/10
                hover:bg-white/20
                text-sm
                transition-colors
            "
        >
            Descargar comprobante
        </button>
    );
}
