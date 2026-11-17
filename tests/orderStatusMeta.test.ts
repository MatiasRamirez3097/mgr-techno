import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "@/constants/status";
import {
    ORDER_STATUS_META,
    PAYMENT_REQUIRED_STATUSES,
    getNextOrderStatuses,
} from "@/components/admin/orders/orderStatusMeta";

describe("getNextOrderStatuses", () => {
    it("pendiente y en espera pasan a en proceso", () => {
        expect(getNextOrderStatuses("pending")).toEqual(["processing"]);
        expect(getNextOrderStatuses("on_hold", "andreani")).toEqual(["processing"]);
    });

    it("en proceso depende del envío", () => {
        expect(getNextOrderStatuses("processing", "local_pickup")).toEqual(["ready_for_pickup"]);
        expect(getNextOrderStatuses("processing", "andreani")).toEqual(["shipped"]);
        expect(getNextOrderStatuses("processing", "local_shipping")).toEqual(["shipped"]);
        expect(getNextOrderStatuses("processing")).toEqual(["ready_for_pickup", "shipped"]);
    });

    it("listo o enviado se completan", () => {
        expect(getNextOrderStatuses("ready_for_pickup")).toEqual(["completed"]);
        expect(getNextOrderStatuses("shipped")).toEqual(["completed"]);
    });

    it("los estados finales no tienen siguiente paso", () => {
        for (const s of ["completed", "cancelled", "refunded", "failed"]) {
            expect(getNextOrderStatuses(s)).toEqual([]);
        }
    });

    it("todos los pasos sugeridos son estados válidos", () => {
        const valid = new Set(ORDER_STATUSES.map((s) => s.value));
        for (const s of ORDER_STATUSES) {
            for (const next of getNextOrderStatuses(s.value, "local_pickup")) expect(valid.has(next)).toBe(true);
            for (const next of getNextOrderStatuses(s.value, "andreani")) expect(valid.has(next)).toBe(true);
        }
    });
});

describe("ORDER_STATUS_META", () => {
    it("tiene etiqueta para cada estado de orden", () => {
        for (const s of ORDER_STATUSES) expect(ORDER_STATUS_META[s.value]).toBeDefined();
    });

    it("los estados que piden pago son estados válidos", () => {
        const valid = new Set(ORDER_STATUSES.map((s) => s.value));
        for (const s of PAYMENT_REQUIRED_STATUSES) expect(valid.has(s)).toBe(true);
    });
});
