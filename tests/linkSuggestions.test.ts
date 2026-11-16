import { describe, expect, it } from "vitest";
import {
    MAX_NAME_SUGGESTIONS,
    buildLinkSuggestions,
    suggestionKey,
    type SuggestionCatalogItem,
} from "@/lib/distributors/linkSuggestions";
import type { DistributorKey } from "@/types/shared/distributorLink";

const item = (
    distributor: DistributorKey,
    id: string,
    name: string,
    partNumber = "",
): SuggestionCatalogItem => ({
    distributor,
    distributorProductId: id,
    distributorSku: partNumber || id,
    partNumber,
    ean: "",
    name,
    link: null,
    image: null,
    price: 100000,
    stock: 3,
});

const product = { id: "p1", name: "Placa de Video MSI GeForce RTX 4060 Ventus 2X 8GB", mpn: "912-V516-001" };

const items = [
    item("elit", "e1", "VGA MSI RTX 4060 VENTUS 2X 8G", "912-V516-001"),
    item("elit", "e2", "VGA MSI RTX 4060 VENTUS 2X BLACK 8G OC"),
    item("newbytes", "n1", "Placa de Video MSI RTX 4060 Ventus 2X Black 8GB OC"),
    item("newbytes", "n2", "Placa de Video MSI RTX 4060 Ventus 3X 8GB OC"),
    item("newbytes", "n3", "Placa de Video MSI RTX 4060 Gaming X 8GB"),
    item("invid", "i1", "Placa de Video MSI RTX 4070 Ventus 2X 12GB"),
];

const none = { linkedDistributors: new Map<string, Set<DistributorKey>>(), dismissed: new Set<string>() };

describe("buildLinkSuggestions", () => {
    it("por código en un distribuidor y por nombre en los que no tienen coincidencia por código", () => {
        const result = buildLinkSuggestions([product], items, none);
        const elit = result.filter((s) => s.item.distributor === "elit");
        // Elit: sólo la coincidencia por part number (no se suman las de nombre)
        expect(elit.map((s) => [s.item.distributorProductId, s.matchMethod])).toEqual([["e1", "part_number"]]);

        const newbytes = result.filter((s) => s.item.distributor === "newbytes");
        expect(newbytes.length).toBeLessThanOrEqual(MAX_NAME_SUGGESTIONS);
        expect(newbytes.every((s) => s.matchMethod === "name" && s.score >= 0.5)).toBe(true);
        expect(newbytes[0].item.distributorProductId).toBe("n1");

        // Otro modelo (4070) no se sugiere
        expect(result.some((s) => s.item.distributor === "invid")).toBe(false);
    });

    it("no sugiere en distribuidores ya vinculados ni lo descartado", () => {
        const result = buildLinkSuggestions([product], items, {
            linkedDistributors: new Map([["p1", new Set<DistributorKey>(["elit"])]]),
            dismissed: new Set([suggestionKey("p1", "newbytes", "n1")]),
        });
        expect(result.some((s) => s.item.distributor === "elit")).toBe(false);
        expect(result.some((s) => s.item.distributorProductId === "n1")).toBe(false);
    });
});
