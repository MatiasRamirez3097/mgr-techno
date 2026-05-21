import puppeteer from "puppeteer";

const isVercel = !!process.env.VERCEL;

export async function getBrowser() {
    /*
    |--------------------------------------------------------------------------
    | LOCAL
    |--------------------------------------------------------------------------
    */

    if (!isVercel) {
        return puppeteer.launch({
            executablePath: process.env.CHROME_EXECUTABLE_PATH,

            headless: true,

            protocolTimeout: 120000,

            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | VERCEL
    |--------------------------------------------------------------------------
    */

    const chromium = (await import("@sparticuz/chromium")).default;

    const puppeteerCore = (await import("puppeteer-core")).default;

    return puppeteerCore.launch({
        args: chromium.args,

        executablePath: await chromium.executablePath(),

        headless: true,

        protocolTimeout: 120000,
    });
}
