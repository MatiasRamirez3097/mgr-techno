import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    customer?: any;
    mode: "create" | "edit";
    onCancel: () => void;
    modal?: boolean;
}

export function CustomerForm({ onCancel, mode, customer, modal }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        documentType: customer?.document?.ducomentType || "DNI",
        documentNumber: customer?.document?.number || "",
        taxCondition: customer?.taxCondiction || "",
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        address1: customer?.address1 || "",
        city: customer?.city || "",
        state: customer?.state || "",
        postcode: customer?.postcode || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
    });

    async function fetchCustomerByCUIT(cuit: string) {
        console.log(cuit);
        const res = await fetch("/api/afip/padron", {
            method: "POST",
            body: JSON.stringify({ cuit }),
        });

        const data = await res.json();
        if (data.success) {
            console.log(">>>entity", data.entity);
            return data.entity;
        }

        throw new Error("No encontrado");
    }

    const handleCUITBlur = async (cuit: string) => {
        try {
            const customer = await fetchCustomerByCUIT(cuit);
            setForm((prev) => ({
                ...prev,
                lastName: customer.name,
                taxCondition: customer.taxCondition,
                address1: customer.address?.street ?? form.address1,
                city: customer.address?.city,
                postcode: customer.address?.zip ?? form.postcode,
                state: customer.address?.state ?? form.state,
                notes: customer.notes,
            }));
        } catch (err) {
            console.log("CUIT no encontrado");
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
        //notes: form.notes != "" ? form.notes : null,
        email: form.email != "" ? form.email : null,
        street: form.address1,
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

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create" && !modal)
                router.push(`/admin/customers/${data.id}`);
            else router.refresh();
        } catch (e: any) {
            setError(e.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-4">
                    Información básica
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Tipo de documento</label>
                        <select
                            name="documentType"
                            value={form.documentType}
                            onChange={handleSelectChange}
                            className={inputClass}
                        >
                            <option value="DNI">DNI</option>
                            <option value="CUIL">CUIL</option>
                            <option value="CUIT">CUIT</option>
                        </select>
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>DNI/CUIL/CUIT </label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                placeholder="DNI/CUIL/CUIT"
                                name="documentNumber"
                                value={form.documentNumber}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={(e) =>
                                    handleCUITBlur(form.documentNumber)
                                }
                                className="px-4 py-3 rounded-lg bg-brand text-white text-sm hover:brightness-110 transition"
                            >
                                i
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Nombre </label>
                        <div className="flex gap-2">
                            <input
                                name="firstName"
                                className={inputClass}
                                placeholder="Nombre"
                                value={form.firstName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Apellido </label>
                        <div className="flex gap-2">
                            <input
                                name="lastName"
                                className={inputClass}
                                placeholder="Apellido"
                                value={form.lastName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Cod Postal </label>
                        <input
                            className={inputClass}
                            placeholder="Codigo Postal"
                            name="postcode"
                            value={form.postcode}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Direccion </label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                name="address1"
                                placeholder="Direccion"
                                value={form.address1}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Ciudad</label>
                        <input
                            className={inputClass}
                            placeholder="Ciudad"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Provincia</label>
                        <input
                            name="state"
                            className={inputClass}
                            placeholder="Provincia"
                            value={form.state}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </section>
            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-4">
                    Datos de contacto
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span">
                        <label className={labelClass}>Email</label>
                        <input
                            name="email"
                            className={inputClass}
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Tel Contacto </label>
                        <div className="flex gap-2">
                            <input
                                name="phone"
                                className={inputClass}
                                placeholder="Tel contacto"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-brand text-white text-sm"
                >
                    {loading ? "Creando..." : "Crear"}
                </button>
            </div>
        </form>
    );
}
