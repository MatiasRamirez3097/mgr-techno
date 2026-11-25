"use client";

import { useState } from "react";
import Image from "next/image";
import { buttonClass, inputClass } from "@/components/admin/ui/styles";
import type { StockCountDTO } from "@/types/shared/stockCount";

export const units = (n: number) => `${n} ${Math.abs(n) === 1 ? "unidad" : "unidades"}`;

export async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Error de conexión");
    return body as T;
}

/** "Faltan 2" / "Sobran 3" / "Coincide" */
export function describeDifference(difference: number): string {
    if (difference === 0) return "Coincide";
    return difference < 0 ? `Faltan ${units(-difference)}` : `Sobran ${units(difference)}`;
}

export function Thumb({ image, name }: { image: string | null; name: string }) {
    if (!image) return <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-800" />;
    return (
        <Image src={image} alt={name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
    );
}

export async function postCount(productId: string, counted: number): Promise<StockCountDTO> {
    const { data } = await readJson<{ data: StockCountDTO }>(
        await fetch("/api/admin/stock-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, counted }),
        }),
    );
    return data;
}

export function CountInput({
    onSubmit,
    saving,
    label,
}: {
    onSubmit: (counted: number) => void;
    saving: boolean;
    label: string;
}) {
    const [value, setValue] = useState("");
    return (
        <form
            className="flex gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (value === "") return;
                onSubmit(Number(value));
            }}
        >
            <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Contadas"
                className={`${inputClass} w-28`}
                aria-label={label}
            />
            <button type="submit" className={buttonClass.primary} disabled={value === "" || saving}>
                {saving ? "Guardando…" : "Guardar"}
            </button>
        </form>
    );
}
