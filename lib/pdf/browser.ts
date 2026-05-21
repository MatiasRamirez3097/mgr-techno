import puppeteer from "puppeteer";

const isProduction = !!process.env.VERCEL;

export async function getBrowser() {
    /*
     * LOCAL WINDOWS
     */

    if (!isProduction) {
        return puppeteer.launch({
            headless: true,

            executablePath: process.env.CHROME_EXECUTABLE_PATH,

            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    /*
     * VERCEL
     */

    const puppeteerCore = (await import("puppeteer-core")).default;

    const chromium = (await import("@sparticuz/chromium")).default;

    return puppeteerCore.launch({
        args: chromium.args,

        executablePath: await chromium.executablePath(),

        headless: true,
    });
}
