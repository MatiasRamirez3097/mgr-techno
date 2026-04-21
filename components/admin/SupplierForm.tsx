import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    supplier?: any;
    mode: "create" | "edit";
    onCancel: () => void;
}

export function SupplierForm({ onCancel, mode, supplier }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        name: supplier?.name || "",
        taxId: supplier?.taxId || "",
        email: supplier?.email || "",
        phone: supplier?.phone || "",
        website: supplier?.website || "",
        address: supplier?.adress || {},
        contactName: supplier?.contactName || "",
        notes: supplier?.notes || "",
        isActive: supplier?.isActive,
    });

    async function fetchSupplierByCUIT(cuit: string) {
        const res = await fetch("/api/afip/padron", {
            method: "POST",
            body: JSON.stringify({ cuit }),
        });

        const data = await res.json();
        console.log("res>>>", data.success);
        console.log(">>>>", data);
        if (data.success) {
            return data.supplier;
        }

        throw new Error("No encontrado");
    }

    const handleCUITBlur = async (cuit: string) => {
        try {
            const supplier = await fetchSupplierByCUIT(cuit);
            setForm((prev) => ({
                ...prev,
                name: supplier.name,
                address: supplier.address,
                isActive: supplier.isActive,
                notes: supplier.notes,
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

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create") router.push(`/admin/suppliers/${data.id}`);
            else router.refresh();
        } catch (e: any) {
            setError(e.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
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
                    <div className="col-span">
                        <label className={labelClass}>CUIT </label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                placeholder="CUIT"
                                name="taxId"
                                value={form.taxId}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={(e) => handleCUITBlur(form.taxId)}
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
                                className={inputClass}
                                placeholder="Nombre"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Email</label>
                        <input
                            className={inputClass}
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Website</label>
                        <input
                            className={inputClass}
                            placeholder="Webstie"
                            value={form.website}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span">
                        <label className={labelClass}>Cod Postal </label>
                        <input
                            className={inputClass}
                            placeholder="Codigo Postal"
                            name="zip"
                            value={form.address.zip}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Direccion </label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                placeholder="Direccion"
                                value={form.address.street}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Ciudad</label>
                        <input
                            className={inputClass}
                            placeholder="Ciudad"
                            value={form.address.city}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span">
                        <label className={labelClass}>Provincia</label>
                        <input
                            className={inputClass}
                            placeholder="Provincia"
                            value={form.address.state}
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
                        <label className={labelClass}>Nombre Contacto</label>
                        <input
                            className={inputClass}
                            placeholder="Nombre Contacto"
                            name="contactName"
                            value={form.contactName}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Tel Contacto </label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                placeholder="Tel contacto"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className={labelClass}>Notas</label>
                        <textarea
                            className={inputClass}
                            placeholder="notas..."
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                        />
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
