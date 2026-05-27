export async function generateVoucherNumber(type: string) {
    const prefixMap: Record<string, string> = {
        non_fiscal_receipt: "REC",
        fiscal_invoice: "FAC",
        credit_note: "NC",
        debit_note: "ND",
    };

    const prefix = prefixMap[type] || "DOC";

    return `${prefix}-${Date.now()}`;
}
