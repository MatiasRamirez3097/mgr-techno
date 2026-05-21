import puppeteer from "puppeteer";

const isVercel = !!process.env.VERCEL;

export async function getBrowser() {
    console.log("IS_VERCEL:", isVercel);

    if (!isVercel) {
        console.log("USING LOCAL CHROME");

        return puppeteer.launch({
            executablePath: process.env.CHROME_EXECUTABLE_PATH,

            headless: true,

            protocolTimeout: 120000,

            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    console.log("USING SERVERLESS CHROMIUM");

    const chromium = (await import("@sparticuz/chromium")).default;

    const puppeteerCore = (await import("puppeteer-core")).default;

    const executablePath = await chromium.executablePath();

    console.log("CHROMIUM PATH:", executablePath);

    return puppeteerCore.launch({
        executablePath,

        args: chromium.args,

        headless: true,

        protocolTimeout: 120000,
    });
}
