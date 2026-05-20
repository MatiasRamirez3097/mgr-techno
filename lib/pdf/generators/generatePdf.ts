import { getBrowser } from "@/lib/pdf/browser";

export async function generatePdf(html: string) {
    const browser = await getBrowser();

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "networkidle0",
        });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
        });

        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}
