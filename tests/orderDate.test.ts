import { describe, expect, it } from "vitest";
import { parseOrderDate, todayInStoreTimeZone } from "@/lib/utils/orderDate";

// 22/10/2026 23:30 en Argentina = 23/10/2026 02:30 UTC
const NOW = new Date("2026-10-23T02:30:00Z");

describe("todayInStoreTimeZone", () => {
    it("usa el día de Argentina, no el de UTC", () => {
        expect(todayInStoreTimeZone(NOW)).toBe("2026-10-22");
    });
});

describe("parseOrderDate", () => {
    it("sin fecha o con la de hoy deja que Mongoose use la hora actual", () => {
        expect(parseOrderDate(undefined, NOW)).toBeUndefined();
        expect(parseOrderDate("2026-10-22", NOW)).toBeUndefined();
    });

    it("una fecha pasada se guarda al mediodía de ese día en Argentina", () => {
        const date = parseOrderDate("2026-10-01", NOW);
        expect(date?.toISOString()).toBe("2026-10-01T15:00:00.000Z");
    });

    it("rechaza fechas futuras, inexistentes o mal formadas", () => {
        expect(() => parseOrderDate("2026-10-23", NOW)).toThrow(/futura/);
        expect(() => parseOrderDate("2026-02-30", NOW)).toThrow(/inválida/);
        expect(() => parseOrderDate("01/10/2026", NOW)).toThrow(/inválida/);
    });
});
