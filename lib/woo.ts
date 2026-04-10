// lib/woo.ts
export const WOO_HEADERS = {
    Authorization:
        "Basic " +
        Buffer.from(
            `${process.env.WOO_KEY}:${process.env.WOO_SECRET}`,
        ).toString("base64"),
    "Content-Type": "application/json",
};
