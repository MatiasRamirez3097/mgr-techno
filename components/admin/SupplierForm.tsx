import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/admin/ui/Field";
import { ModalFormFooter } from "@/components/admin/ui/ModalFormFooter";
import { buttonClass, inputClass, textareaClass } from "@/components/admin/ui/styles";

interface Props {
    supplier?: any;
    mode: "create" | "edit";
    onCancel: () => void;
    onSuccess?: (supplier: any) => void;
    modal?: boolean;
}

export function SupplierForm({
    onCancel,
    onSuccess,
    mode,
    supplier,
    modal,
}: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cuitLoading, setCuitLoading] = useState(false);
    const [cuitFeedback, setCuitFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const [form, setForm] = useState({
        name: supplier?.name || "",
        taxId: supplier?.taxId || "",
        email: supplier?.email || "",
        phone: supplier?.phone || "",
        website: supplier?.website || "",
        address: supplier?.address || {
            city: supplier?.address?.city || "",
            state: supplier?.address?.state || "",
            zip: supplier?.address?.zip || "",
            street: supplier?.address?.street || "",
        },
        contactName: supplier?.contactName || "",
        notes: supplier?.notes || "",
        isActive: supplier?.isActive,
    });

    async function fetchSupplierByCUIT(cuit: string) {
        const cleanCuit = cuit.replace(/\D/g, "");
        const res = await fetch("/api/afip/padron", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cuit: cleanCuit }),
        });

        const data = await res.json();
        if (data.success && data.entity) {
            return data.entity;
        }

        throw new Error(data.error || "No encontrado en padrón AFIP");
    }

    const handleCUITBlur = async (cuit: string) => {
        if (!cuit || cuit.trim().length < 8) return;
        setCuitLoading(true);
        setCuitFeedback(null);

        try {
            const result = await fetchSupplierByCUIT(cuit);
            setForm((prev: any) => ({
                ...prev,
                name: result.name || prev.name,
                address: {
                    ...prev.address,
                    street:
                        result.address?.street || prev.address?.street || "",
                    city: result.address?.city || prev.address?.city || "",
                    zip: result.address?.zip || prev.address?.zip || "",
                    state: result.address?.state || prev.address?.state || "",
                },
            }));
            setCuitFeedback({
                type: "success",
                message: `Datos autocompletados desde AFIP (${result.name})`,
            });
        } catch (err: any) {
            setCuitFeedback({
                type: "error",
                message: err.message || "CUIT no encontrado en padrón AFIP",
            });
        } finally {
            setCuitLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;

        const finalValue =
            type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : value;

        if (name.includes(".")) {
            const [parent, child] = name.split(".");

            setForm((prev: any) => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: finalValue,
                },
            }));

            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]: finalValue,
        }));
    };

    const buildPayload = () => ({
        name: form.name,
        taxId: form.taxId,
        contactName: form.contactName != "" ? form.contactName : null,
        phone: form.phone != "" ? form.phone : null,
        notes: form.notes != "" ? form.notes : null,
        email: form.email != "" ? form.email : null,
        website: form.website != "" ? form.website : null,
        address: {
            street:
                form.address.street && form.address.street != ""
                    ? form.address.street
                    : null,
            state:
                form.address.state && form.address.state != ""
                    ? form.address.state
                    : null,
            city:
                form.address.city && form.address.city != ""
                    ? form.address.city
                    : null,
            zip:
                form.address.zip && form.address.zip != ""
                    ? form.address.zip
                    : null,
            country: "AR",
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/suppliers/${supplier.id}`
                    : "/api/admin/suppliers",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const createdOrUpdated = data.data || data;

            setSuccess(
                mode === "edit"
                    ? "Proveedor actualizado correctamente"
                    : "Proveedor creado con éxito",
            );

            if (onSuccess) {
                onSuccess(createdOrUpdated);
            }

            if (mode === "create" && !modal) {
                const targetId = createdOrUpdated?.id || data.id;
                if (targetId) {
                    router.push(`/admin/suppliers/${targetId}`);
                } else {
                    router.push("/admin/suppliers");
                }
            } else {
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || "Error al guardar el proveedor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Datos fiscales</legend>
                <Field label="CUIT *" className="sm:col-span-2">
                    <div className="flex gap-2">
                        <input
                            className={inputClass}
                            placeholder="Ingresá CUIT..."
                            name="taxId"
                            value={form.taxId}
                            onChange={handleChange}
                            inputMode="numeric"
                        />
                        <button
                            type="button"
                            onClick={() => handleCUITBlur(form.taxId)}
                            disabled={cuitLoading || !form.taxId}
                            className={`${buttonClass.secondary} shrink-0`}
                            title="Consultar en Padrón AFIP"
                        >
                            {cuitLoading ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Buscando...</span>
                                </>
                            ) : (
                                <span>Consultar AFIP</span>
                            )}
                        </button>
                    </div>
                    {cuitFeedback && (
                        <p
                            className={`text-xs mt-1.5 font-medium ${
                                cuitFeedback.type === "success" ? "text-emerald-400" : "text-amber-400"
                            }`}
                        >
                            {cuitFeedback.message}
                        </p>
                    )}
                </Field>
                <Field label="Razón social / nombre" className="sm:col-span-2">
                    <input name="name" className={inputClass} placeholder="Nombre" value={form.name} onChange={handleChange} />
                </Field>
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</legend>
                <Field label="Persona de contacto">
                    <input name="contactName" className={inputClass} placeholder="Nombre del contacto" value={form.contactName} onChange={handleChange} />
                </Field>
                <Field label="Teléfono">
                    <input name="phone" className={inputClass} placeholder="Teléfono" value={form.phone} onChange={handleChange} type="tel" />
                </Field>
                <Field label="Email">
                    <input name="email" className={inputClass} placeholder="correo@proveedor.com" value={form.email} onChange={handleChange} type="email" />
                </Field>
                <Field label="Sitio web">
                    <input name="website" className={inputClass} placeholder="https://..." value={form.website} onChange={handleChange} />
                </Field>
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Domicilio</legend>
                <Field label="Dirección" className="sm:col-span-2">
                    <input name="address.street" className={inputClass} placeholder="Calle y número" value={form.address.street} onChange={handleChange} />
                </Field>
                <Field label="Ciudad">
                    <input name="address.city" className={inputClass} placeholder="Ciudad" value={form.address.city} onChange={handleChange} />
                </Field>
                <Field label="Provincia">
                    <input name="address.state" className={inputClass} placeholder="Provincia" value={form.address.state} onChange={handleChange} />
                </Field>
                <Field label="Código postal">
                    <input name="address.zip" className={inputClass} placeholder="Ej: 2000" value={form.address.zip} onChange={handleChange} />
                </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-4">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</legend>
                <textarea className={textareaClass} placeholder="Notas internas..." name="notes" value={form.notes} onChange={handleChange} />
            </fieldset>

            <ModalFormFooter
                message={
                    error ? (
                        <span className="text-red-400">{error}</span>
                    ) : success ? (
                        <span className="text-green-400">{success}</span>
                    ) : null
                }
            >
                <button type="button" onClick={onCancel} className={buttonClass.ghost}>
                    Cancelar
                </button>
                <button type="submit" disabled={loading} className={buttonClass.primary}>
                    {loading ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear proveedor"}
                </button>
            </ModalFormFooter>
        </form>
    );
}
