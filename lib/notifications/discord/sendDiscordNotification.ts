// lib/notifications/discord/sendDiscordNotification.ts

export async function sendDiscordNotification(payload: {
    title: string;
    description: string;
    color?: number;
}) {
    if (!process.env.DISCORD_WEBHOOK_URL) {
        return;
    }

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            embeds: [
                {
                    title: payload.title,

                    description: payload.description,

                    color: payload.color ?? 0x5865f2,

                    timestamp: new Date().toISOString(),
                },
            ],
        }),
    });
}
