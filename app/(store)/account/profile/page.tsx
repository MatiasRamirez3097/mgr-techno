"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

const PROVINCIAS = [
    "Buenos Aires",
    "CABA",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Córdoba",
    "Corrientes",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego",
    "Tucumán",
];

export default function ProfilePage() {
    const { data: session } = useSession();
    const billing = (session as any)?.billing;
    const document = {
        documentType: (session as any)?.documentType,
        number: (session as any)?.number,
    };

    const [form, setForm] = useState({
        firstName: billing?.firstName || "",
        lastName: billing?.lastName || "",
        address: billing?.address || "",
        city: billing?.city || "",
        state: billing?.state || "",
        postcode: billing?.postcode || "",
        phone: billing?.phone || "",
        document: {
            documentType: document.documentType || "DNI",
            number: document.number || "",
        },
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setError("");

        try {
            const res = await fetch("/api/account/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error();
            setSuccess(true);
        } catch {
            setError("Error al guardar los datos");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl font-bold text-white">Mis datos</h1>

            <form
                onSubmit={handleSubmit}
                className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Nombre
                        </label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Apellido
                        </label>
                        <input
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Tipo de documento
                        </label>
                        <select
                            name="documentType"
                            value={form.document.documentType}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="DNI">DNI</option>
                            <option value="CUIL">CUIL</option>
                            <option value="CUIT">CUIT</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Número de documento
                        </label>
                        <input
                            name="number"
                            value={form.document.number}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-sm text-gray-400 mb-1 block">
                            Dirección
                        </label>
                        <input
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Ciudad
                        </label>
                        <input
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Provincia
                        </label>
                        <select
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        >
                            <option value="">Seleccioná una provincia</option>
                            {PROVINCIAS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Código postal
                        </label>
                        <input
                            name="postcode"
                            value={form.postcode}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Teléfono
                        </label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>
                </div>

                {success && (
                    <p className="text-sm text-green-400 mt-4">
                        Datos guardados correctamente.
                    </p>
                )}
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 px-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                >
                    {loading ? "Guardando..." : "Guardar cambios"}
                </button>
            </form>
        </div>
    );
}

export const dynamic = "force-dynamic";
