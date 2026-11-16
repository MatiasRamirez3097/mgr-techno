import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/admin/ui/Field";
import { ModalFormFooter } from "@/components/admin/ui/ModalFormFooter";
import { buttonClass, inputClass, selectClass } from "@/components/admin/ui/styles";

interface Props {
    customer?: any;
    mode: "create" | "edit";
    onCancel: () => void;
    onSuccess?: (customer: any) => void;
    modal?: boolean;
}

export function CustomerForm({
    onCancel,
    onSuccess,
    mode,
    customer,
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
        documentType:
            customer?.document?.documentType ||
            customer?.document?.ducomentType ||
            "DNI",
        documentNumber: customer?.document?.number || "",
        taxCondition: customer?.taxCondition || customer?.taxCondiction || "",
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        ivaCondition: customer?.ivaCondition?.code || "CF",
        address: customer?.address || "",
        city: customer?.city || "",
        state: customer?.state || "",
        postcode: customer?.postcode || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
    });

    async function fetchCustomerByCUIT(cuit: string) {
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
            const customer = await fetchCustomerByCUIT(cuit);
            setForm((prev) => ({
                ...prev,
                lastName: customer.name || prev.lastName,
                taxCondition: customer.taxCondition || prev.taxCondition,
                address: customer.address?.street ?? form.address,
                city: customer.address?.city ?? prev.city,
                postcode: customer.address?.zip ?? form.postcode,
                state: customer.address?.state ?? form.state,
            }));
            setCuitFeedback({
                type: "success",
                message: `Datos autocompletados desde AFIP (${customer.name})`,
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
        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const buildPayload = () => ({
        firstName: form.firstName,
        lastName: form.lastName,
        documentType: form.documentType,
        documentNumber: form.documentNumber,
        phone: form.phone != "" ? form.phone : null,
        ivaCondition: form.ivaCondition,
        email: form.email != "" ? form.email : null,
        address: form.address,
        state: form.state,
        city: form.city,
        postcode: form.postcode,
        country: "AR",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/customers/${customer.id}`
                    : "/api/admin/customers",
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
                    ? "Cliente actualizado correctamente"
                    : "Cliente creado con éxito",
            );

            if (onSuccess) {
                onSuccess(createdOrUpdated);
            }

            if (mode === "create" && !modal) {
                const targetId = createdOrUpdated?.id || data.id;
                if (targetId) {
                    router.push(`/admin/customers/${targetId}`);
                } else {
                    router.push("/admin/customers");
                }
            } else {
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Identificación fiscal</legend>
                <Field label="Tipo de documento">
                    <select name="documentType" value={form.documentType} onChange={handleSelectChange} className={selectClass}>
                        <option value="DNI">DNI</option>
                        <option value="CUIL">CUIL</option>
                        <option value="CUIT">CUIT</option>
                    </select>
                </Field>
                <Field label="Condición frente al IVA">
                    <select name="ivaCondition" value={form.ivaCondition} onChange={handleSelectChange} className={selectClass}>
                        <option value="CF">Consumidor final</option>
                        <option value="MONOTRIBUTO">Monotributo</option>
                        <option value="RI">Responsable inscripto</option>
                        <option value="EXENTO">IVA exento</option>
                    </select>
                </Field>
                <Field label="DNI / CUIL / CUIT" className="sm:col-span-2">
                    <div className="flex gap-2">
                        <input
                            className={inputClass}
                            placeholder="Ingresá número..."
                            name="documentNumber"
                            value={form.documentNumber}
                            onChange={handleChange}
                            inputMode="numeric"
                        />
                        <button
                            type="button"
                            onClick={() => handleCUITBlur(form.documentNumber)}
                            disabled={cuitLoading || !form.documentNumber}
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
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</legend>
                <Field label="Nombre">
                    <input name="firstName" className={inputClass} placeholder="Nombre" value={form.firstName} onChange={handleChange} />
                </Field>
                <Field label="Apellido">
                    <input name="lastName" className={inputClass} placeholder="Apellido" value={form.lastName} onChange={handleChange} />
                </Field>
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</legend>
                <Field label="Email">
                    <input name="email" className={inputClass} placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} type="email" />
                </Field>
                <Field label="Teléfono">
                    <input name="phone" className={inputClass} placeholder="Ej: 341 555-1234" value={form.phone} onChange={handleChange} type="tel" />
                </Field>
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Domicilio</legend>
                <Field label="Dirección" className="sm:col-span-2">
                    <input name="address" className={inputClass} placeholder="Calle y número" value={form.address} onChange={handleChange} />
                </Field>
                <Field label="Ciudad">
                    <input name="city" className={inputClass} placeholder="Ciudad" value={form.city} onChange={handleChange} />
                </Field>
                <Field label="Provincia">
                    <input name="state" className={inputClass} placeholder="Provincia" value={form.state} onChange={handleChange} />
                </Field>
                <Field label="Código postal">
                    <input name="postcode" className={inputClass} placeholder="Ej: 2000" value={form.postcode} onChange={handleChange} />
                </Field>
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
                    {loading ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear cliente"}
                </button>
            </ModalFormFooter>
        </form>
    );
}
