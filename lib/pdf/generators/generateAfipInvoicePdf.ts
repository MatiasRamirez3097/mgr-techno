import { getBrowser } from "../browser";

export async function generateAfipInvoicePdf(html: string) {
    const browser = await getBrowser();

    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "load",
    });

    const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
    });

    await browser.close();

    return Buffer.from(pdf);
}
