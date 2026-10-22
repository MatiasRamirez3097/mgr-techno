import {
    formatSequence,
    getNextSequence,
} from "@/lib/counters/getNextGenericNumber";

// Número interno correlativo por tipo (REC-00000001). Las facturas fiscales
// lo reemplazan luego por el número de AFIP (00005-0000NNNN).
export async function generateVoucherNumber(type: string) {
    const prefixMap: Record<string, string> = {
        non_fiscal_receipt: "REC",
        fiscal_invoice: "FAC",
        credit_note: "NC",
        debit_note: "ND",
    };

    const prefix = prefixMap[type] || "DOC";

    const seq = await getNextSequence(`voucher_${prefix}`);

    return formatSequence(prefix, seq);
}
