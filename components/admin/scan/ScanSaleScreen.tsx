"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { CameraScanner } from "./CameraScanner";
import { ProductSelector, type ProductOption } from "@/components/admin/ProductSelector";
import { buttonClass, cardClass, inputClass, labelClass, selectClass } from "@/components/admin/ui/styles";
import type { PendingSaleDTO, ScannedProductDTO } from "@/types/shared/pendingSale";
import type { ProductCodeField } from "@/lib/scan/productCode";

type Step =
    | { kind: "scanning" }
    | { kind: "searching"; code: string }
    | { kind: "found"; code: string; product: ScannedProductDTO }
    | { kind: "multiple"; code: string; products: ScannedProductDTO[] }
    | { kind: "notFound"; code: string; suggestedField: ProductCodeField | null };

const FIELD_LABEL: Record<ProductCodeField, string> = { gtin: "GTIN", sku: "SKU", mpn: "MPN" };

const formatPrice = (value: number) =>
    value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Error de conexión");
    return body as T;
}

/** Pantalla para el celular: escanear un producto vendido y dejarlo como venta pendiente. */
export function ScanSaleScreen() {
    const [step, setStep] = useState<Step>({ kind: "scanning" });
    const [manualCode, setManualCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [recent, setRecent] = useState<PendingSaleDTO[]>([]);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/admin/pending-sales?status=pending&limit=20", { cache: "no-store" })
            .then((res) => readJson<{ data: PendingSaleDTO[] }>(res))
            .then(({ data }) => {
                if (!cancelled) setRecent(data);
            })
            // La lista es informativa; si falla no bloquea el escaneo
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const lookup = useCallback(async (rawCode: string) => {
        const code = rawCode.trim();
        if (!code) return;
        setError(null);
        setNotice(null);
        setStep({ kind: "searching", code });
        try {
            const { data, suggestedField } = await readJson<{
                data: ScannedProductDTO[];
                suggestedField: ProductCodeField | null;
            }>(await fetch(`/api/admin/pending-sales/lookup?code=${encodeURIComponent(code)}`));

            if (data.length === 1) setStep({ kind: "found", code, product: data[0] });
            else if (data.length > 1) setStep({ kind: "multiple", code, products: data });
            else setStep({ kind: "notFound", code, suggestedField });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error buscando el código");
            setStep({ kind: "scanning" });
        }
    }, []);

    const reset = () => {
        setError(null);
        setStep({ kind: "scanning" });
    };

    const onRegistered = (sale: PendingSaleDTO) => {
        setNotice(`Registrado: ${sale.quantity} × ${sale.productName}`);
        setRecent((prev) => [sale, ...prev.filter((s) => s.id !== sale.id)]);
        setStep({ kind: "scanning" });
    };

    const discard = async (sale: PendingSaleDTO) => {
        if (!confirm(`¿Descartar ${sale.quantity} × ${sale.productName}? Se libera el stock reservado.`)) return;
        try {
            await readJson(await fetch(`/api/admin/pending-sales/${sale.id}/discard`, { method: "POST" }));
            setRecent((prev) => prev.filter((s) => s.id !== sale.id));
            setNotice(`Descartado: ${sale.productName}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error descartando");
        }
    };

    return (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
            <CameraScanner active={step.kind === "scanning"} onDetected={lookup} />

            {notice && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                    {notice}
                </div>
            )}
            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

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

            {step.kind === "searching" && (
                <div className={`${cardClass} p-4 text-sm text-gray-400`}>Buscando {step.code}…</div>
            )}

            {step.kind === "found" && (
                <ConfirmSale code={step.code} product={step.product} onCancel={reset} onRegistered={onRegistered} />
            )}

            {step.kind === "multiple" && (
                <div className={`${cardClass} p-4`}>
                    <p className="mb-3 text-sm text-gray-300">
                        El código <span className="font-mono text-white">{step.code}</span> coincide con varios
                        productos. Elegí cuál es:
                    </p>
                    <div className="flex flex-col gap-2">
                        {step.products.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setStep({ kind: "found", code: step.code, product: p })}
                                className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 p-3 text-left hover:border-brand"
                            >
                                <ProductThumb image={p.image} name={p.name} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-white">{p.name}</span>
                                    <span className="text-xs text-gray-400">Stock: {p.availableStock}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <button type="button" className={`${buttonClass.ghost} mt-3 w-full`} onClick={reset}>
                        Cancelar
                    </button>
                </div>
            )}

            {step.kind === "notFound" && (
                <LinkCode
                    code={step.code}
                    suggestedField={step.suggestedField}
                    onCancel={reset}
                    onLinked={() => lookup(step.code)}
                />
            )}

            <RecentList sales={recent} onDiscard={discard} />
        </div>
    );
}

function ProductThumb({ image, name }: { image: string | null; name: string }) {
    if (!image) return <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-800" />;
    return (
        <Image
            src={image}
            alt={name}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain"
        />
    );
}

function ConfirmSale({
    code,
    product,
    onCancel,
    onRegistered,
}: {
    code: string;
    product: ScannedProductDTO;
    onCancel: () => void;
    onRegistered: (sale: PendingSaleDTO) => void;
}) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBundle = product.type === "bundle";
    const notEnoughStock = quantity > product.availableStock;

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data } = await readJson<{ data: PendingSaleDTO }>(
                await fetch("/api/admin/pending-sales", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ productId: product.id, quantity, scannedCode: code, notes }),
                }),
            );
            onRegistered(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error registrando la venta");
            setSaving(false);
        }
    };

    return (
        <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-3">
                <ProductThumb image={product.image} name={product.name} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{product.name}</p>
                    <p className="text-xs text-gray-400">
                        {formatPrice(product.effectivePrice)} · Stock disponible: {product.availableStock}
                    </p>
                </div>
            </div>

            {isBundle ? (
                <p className="mt-4 text-sm text-amber-300">
                    Es un combo: no se puede registrar por escaneo. Cargalo como pedido.
                </p>
            ) : (
                <>
                    <div className="mt-4 flex items-center justify-center gap-4">
                        <button
                            type="button"
                            className={`${buttonClass.secondary} h-12 w-12 text-xl`}
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            aria-label="Restar uno"
                        >
                            −
                        </button>
                        <span className="w-12 text-center text-3xl font-bold text-white">{quantity}</span>
                        <button
                            type="button"
                            className={`${buttonClass.secondary} h-12 w-12 text-xl`}
                            onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                            aria-label="Sumar uno"
                        >
                            +
                        </button>
                    </div>

                    <input
                        className={`${inputClass} mt-4`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Nota opcional (cliente, cómo pagó…)"
                        maxLength={500}
                    />

                    {notEnoughStock && (
                        <p className="mt-2 text-xs text-amber-300">No hay stock disponible suficiente.</p>
                    )}
                    {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                </>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className={buttonClass.secondary} onClick={onCancel} disabled={saving}>
                    Cancelar
                </button>
                {!isBundle && (
                    <button
                        type="button"
                        className={buttonClass.primary}
                        onClick={submit}
                        disabled={saving || notEnoughStock}
                    >
                        {saving ? "Registrando…" : "Registrar venta"}
                    </button>
                )}
            </div>
        </div>
    );
}

function LinkCode({
    code,
    suggestedField,
    onCancel,
    onLinked,
}: {
    code: string;
    suggestedField: ProductCodeField | null;
    onCancel: () => void;
    onLinked: () => void;
}) {
    const [product, setProduct] = useState<ProductOption | null>(null);
    const [field, setField] = useState<ProductCodeField>(suggestedField ?? "mpn");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!product) return;
        setSaving(true);
        setError(null);
        try {
            await readJson(
                await fetch("/api/admin/pending-sales/assign-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ productId: product.id, field, code }),
                }),
            );
            onLinked();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error guardando el código");
            setSaving(false);
        }
    };

    return (
        <div className={`${cardClass} p-4`}>
            <p className="text-sm text-gray-300">
                No hay ningún producto con el código <span className="font-mono text-white">{code}</span>. Buscalo
                por nombre y se lo guardamos para la próxima.
            </p>

            <div className="mt-4">
                <ProductSelector value={product} onChange={setProduct} statusAll excludeBundles />
            </div>

            <div className="mt-4">
                <label className={labelClass} htmlFor="scan-code-field">
                    Guardar el código como
                </label>
                <select
                    id="scan-code-field"
                    className={selectClass}
                    value={field}
                    onChange={(e) => setField(e.target.value as ProductCodeField)}
                >
                    {(["gtin", "sku", "mpn"] as const).map((f) => (
                        <option key={f} value={f} disabled={f === "gtin" && suggestedField !== "gtin"}>
                            {FIELD_LABEL[f]}
                            {f === "gtin" ? " (código de barras EAN/UPC)" : f === "mpn" ? " (número de parte)" : ""}
                        </option>
                    ))}
                </select>
                {product && (
                    <p className="mt-1 text-xs text-gray-500">
                        Si el producto ya tenía un {FIELD_LABEL[field]}, se reemplaza.
                    </p>
                )}
            </div>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className={buttonClass.secondary} onClick={onCancel} disabled={saving}>
                    Cancelar
                </button>
                <button
                    type="button"
                    className={buttonClass.primary}
                    onClick={submit}
                    disabled={!product || saving}
                >
                    {saving ? "Guardando…" : "Vincular y seguir"}
                </button>
            </div>
        </div>
    );
}

function RecentList({ sales, onDiscard }: { sales: PendingSaleDTO[]; onDiscard: (sale: PendingSaleDTO) => void }) {
    if (sales.length === 0) return null;
    return (
        <section className={`${cardClass} p-4`}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-300">Pendientes de formalizar ({sales.length})</h2>
                <Link href="/admin/pending-sales" className="text-xs font-semibold text-brand">
                    Ver bandeja
                </Link>
            </div>
            <ul className="flex flex-col divide-y divide-gray-800">
                {sales.map((sale) => (
                    <li key={sale.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">
                                {sale.quantity} × {sale.productName}
                            </p>
                            <p className="text-xs text-gray-500">
                                {new Date(sale.createdAt).toLocaleString("es-AR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                {sale.createdBy ? ` · ${sale.createdBy}` : ""}
                                {sale.notes ? ` · ${sale.notes}` : ""}
                            </p>
                        </div>
                        <button type="button" className={buttonClass.ghost} onClick={() => onDiscard(sale)}>
                            Descartar
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
