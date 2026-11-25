"use client";

import { useCallback, useState } from "react";
import { CameraScanner } from "@/components/admin/scan/CameraScanner";
import { LinkCode } from "@/components/admin/scan/ScanSaleScreen";
import { buttonClass, cardClass, hintClass, inputClass } from "@/components/admin/ui/styles";
import type { ProductCodeField } from "@/lib/scan/productCode";
import type { ScannedProductDTO } from "@/types/shared/pendingSale";
import type { StockCountDTO } from "@/types/shared/stockCount";
import { CountInput, postCount, readJson, Thumb } from "./shared";

type Step =
    | { kind: "closed" }
    | { kind: "scanning" }
    | { kind: "searching"; code: string }
    | { kind: "found"; product: ScannedProductDTO }
    | { kind: "multiple"; code: string; products: ScannedProductDTO[] }
    | { kind: "notFound"; code: string; suggestedField: ProductCodeField | null };

/**
 * Contar escaneando: se lee el código de barras del producto en la estantería y se carga cuántas
 * hay. Sirve para los de la lista y para cualquier otro. Sigue a ciegas: lo esperado se ve al guardar.
 */
export function ScanToCount({
    onCounted,
    onError,
}: {
    onCounted: (count: StockCountDTO) => void;
    onError: (error: unknown) => void;
}) {
    const [step, setStep] = useState<Step>({ kind: "closed" });
    const [manualCode, setManualCode] = useState("");
    const [saving, setSaving] = useState(false);

    const lookup = useCallback(
        async (rawCode: string) => {
            const code = rawCode.trim();
            if (!code) return;
            setStep({ kind: "searching", code });
            try {
                const { data, suggestedField } = await readJson<{
                    data: ScannedProductDTO[];
                    suggestedField: ProductCodeField | null;
                }>(await fetch(`/api/admin/pending-sales/lookup?code=${encodeURIComponent(code)}`));
                if (data.length === 1) setStep({ kind: "found", product: data[0] });
                else if (data.length > 1) setStep({ kind: "multiple", code, products: data });
                else setStep({ kind: "notFound", code, suggestedField });
            } catch (error) {
                onError(error);
                setStep({ kind: "scanning" });
            }
        },
        [onError],
    );

    const scanAgain = () => setStep({ kind: "scanning" });

    if (step.kind === "closed") {
        return (
            <button type="button" className={`${buttonClass.primary} w-full`} onClick={scanAgain}>
                Escanear para contar
            </button>
        );
    }

    return (
        <section className={`${cardClass} flex flex-col gap-3 p-4`}>
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-300">Escanear para contar</h2>
                <button type="button" className={buttonClass.ghost} onClick={() => setStep({ kind: "closed" })}>
                    Cerrar
                </button>
            </div>

            <CameraScanner active={step.kind === "scanning"} onDetected={lookup} />

            {step.kind === "scanning" && (
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        lookup(manualCode);
                        setManualCode("");
                    }}
                >
                    <input
                        className={inputClass}
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="O escribí el código (GTIN, SKU o MPN)"
                        autoCapitalize="characters"
                        autoCorrect="off"
                    />
                    <button type="submit" className={buttonClass.secondary} disabled={!manualCode.trim()}>
                        Buscar
                    </button>
                </form>
            )}

            {step.kind === "searching" && <p className="text-sm text-gray-400">Buscando {step.code}…</p>}

            {step.kind === "found" &&
                (step.product.type === "bundle" ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-amber-300">Es un combo: contá sus componentes por separado.</p>
                        <button type="button" className={buttonClass.secondary} onClick={scanAgain}>
                            Escanear otro
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <Thumb image={step.product.image} name={step.product.name} />
                            <p className="min-w-0 flex-1 text-sm text-white">{step.product.name}</p>
                        </div>
                        <CountInput
                            key={step.product.id}
                            label={`Unidades contadas de ${step.product.name}`}
                            saving={saving}
                            onSubmit={async (counted) => {
                                setSaving(true);
                                try {
                                    onCounted(await postCount(step.product.id, counted));
                                    scanAgain();
                                } catch (error) {
                                    onError(error);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        />
                        <button type="button" className={buttonClass.ghost} onClick={scanAgain}>
                            Cancelar
                        </button>
                    </div>
                ))}

            {step.kind === "multiple" && (
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-300">
                        El código <span className="font-mono text-white">{step.code}</span> coincide con varios productos:
                    </p>
                    {step.products.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setStep({ kind: "found", product: p })}
                            className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 p-3 text-left hover:border-brand"
                        >
                            <Thumb image={p.image} name={p.name} />
                            <span className="min-w-0 flex-1 truncate text-sm text-white">{p.name}</span>
                        </button>
                    ))}
                    <button type="button" className={buttonClass.ghost} onClick={scanAgain}>
                        Cancelar
                    </button>
                </div>
            )}

            {step.kind === "notFound" && (
                <LinkCode
                    code={step.code}
                    suggestedField={step.suggestedField}
                    onCancel={scanAgain}
                    onLinked={() => lookup(step.code)}
                />
            )}

            <p className={hintClass}>Después de guardar vuelve a la cámara para seguir con el próximo.</p>
        </section>
    );
}
