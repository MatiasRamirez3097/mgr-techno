"use client";

import { useState } from "react";
import Image from "next/image";
import { ResponsiveTable, type Column } from "@/components/admin/ui/ResponsiveTable";
import { ModalFormFooter } from "@/components/admin/ui/ModalFormFooter";
import { buttonClass } from "@/components/admin/ui/styles";
import { useRouter } from "next/navigation";
import { FormModal } from "@/components/admin/FormModal";
import { useCloudinaryUpload } from "@/components/admin/cloudinary/useCloudinaryUpload";
import { HeroSlideContent } from "@/components/home/HeroSlideContent";
import type { HeroSlideDTO } from "@/types/shared/heroSlide";

interface Props {
    initialSlides: HeroSlideDTO[];
}

type FormState = Omit<HeroSlideDTO, "id">;

const EMPTY_FORM: FormState = {
    image: "",
    title: "",
    subtitle: "",
    ctaLabel: "",
    href: "",
    openInNewTab: false,
    order: 0,
    active: true,
};

// Misma proporción que el carrusel de la home (aspect-[21/9])
const HERO_ASPECT_RATIO = 21 / 9;

const inputClass =
    "mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand";

export function HeroSlidesManager({ initialSlides }: Props) {
    const router = useRouter();
    const [slides, setSlides] = useState(initialSlides);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [error, setError] = useState("");

    const setImage = (image: string) => setForm((prev) => (prev ? { ...prev, image } : prev));

    const {
        openUploadWidget,
        openMediaLibrary,
        isLoading: uploading,
        error: uploadError,
    } = useCloudinaryUpload({
        folder: "mgrtechno/hero",
        onUploadSuccess: (url) => setImage(url),
        onBatchUploadSuccess: (urls) => urls[0] && setImage(urls[0]),
    });

    const openForm = (slide?: HeroSlideDTO) => {
        setError("");
        setEditingId(slide?.id ?? null);
        if (slide) {
            setForm({
                image: slide.image,
                title: slide.title,
                subtitle: slide.subtitle,
                ctaLabel: slide.ctaLabel,
                href: slide.href,
                openInNewTab: slide.openInNewTab,
                order: slide.order,
                active: slide.active,
            });
        } else {
            const nextOrder = Math.max(0, ...slides.map((s) => s.order)) + 10;
            setForm({ ...EMPTY_FORM, order: nextOrder });
        }
    };

    const closeForm = () => {
        setForm(null);
        setEditingId(null);
    };

    const sortSlides = (list: HeroSlideDTO[]) => [...list].sort((a, b) => a.order - b.order);

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(
                editingId ? `/api/admin/hero-slides/${editingId}` : "/api/admin/hero-slides",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "No se pudo guardar");

            const saved: HeroSlideDTO = data.slide;
            setSlides((prev) => sortSlides([...prev.filter((s) => s.id !== saved.id), saved]));
            closeForm();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (slide: HeroSlideDTO) => {
        const { id, ...rest } = slide;
        const res = await fetch(`/api/admin/hero-slides/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...rest, active: !slide.active }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || "No se pudo actualizar");
            return;
        }
        setSlides((prev) => prev.map((s) => (s.id === id ? data.slide : s)));
    };

    const handleDelete = async (slide: HeroSlideDTO) => {
        if (!confirm(`¿Eliminar el banner${slide.title ? ` "${slide.title}"` : ""}?`)) return;
        const res = await fetch(`/api/admin/hero-slides/${slide.id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error || "No se pudo eliminar");
            return;
        }
        setSlides((prev) => prev.filter((s) => s.id !== slide.id));
        router.refresh();
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= slides.length) return;

        const reordered = [...slides];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

        const previous = slides;
        setSlides(reordered.map((s, i) => ({ ...s, order: (i + 1) * 10 })));
        setReordering(true);
        try {
            const res = await fetch("/api/admin/hero-slides/reorder", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "No se pudo reordenar");
            }
        } catch (err) {
            setSlides(previous);
            alert(err instanceof Error ? err.message : "No se pudo reordenar");
        } finally {
            setReordering(false);
        }
    };

    const toggleClass = (active: boolean) =>
        `text-xs font-medium px-2.5 py-1 rounded-full border transition ${
            active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-800 text-gray-400 border-gray-700"
        }`;
    const moveClass =
        "w-9 h-9 md:w-7 md:h-6 rounded bg-gray-800 text-gray-300 hover:text-white disabled:opacity-30 transition";

    const columns: Column<HeroSlideDTO>[] = [
        {
            key: "order",
            header: "Orden",
            mobile: "actions",
            cell: (s) => {
                const i = slides.indexOf(s);
                return (
                    <div className="flex gap-1 md:flex-col">
                        <button type="button" onClick={() => handleMove(i, -1)} disabled={i === 0 || reordering} aria-label="Subir" className={moveClass}>
                            ▲
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMove(i, 1)}
                            disabled={i === slides.length - 1 || reordering}
                            aria-label="Bajar"
                            className={moveClass}
                        >
                            ▼
                        </button>
                    </div>
                );
            },
        },
        {
            key: "image",
            header: "Imagen",
            mobile: "media",
            cell: (s) => (
                <div className="relative w-24 md:w-40 aspect-[21/9] rounded-lg overflow-hidden bg-gray-800">
                    <Image src={s.image} alt={s.title || "Banner"} fill sizes="160px" className="object-cover" />
                </div>
            ),
        },
        {
            key: "text",
            header: "Texto",
            mobile: "title",
            cell: (s) => (
                <>
                    <div className="font-medium text-white">{s.title || "—"}</div>
                    {s.subtitle && <div className="text-xs text-gray-400">{s.subtitle}</div>}
                    {s.ctaLabel && <div className="text-xs text-gray-500 mt-0.5">Botón: {s.ctaLabel}</div>}
                </>
            ),
        },
        {
            key: "href",
            header: "Vínculo",
            className: "text-xs text-gray-300 font-mono break-all max-w-[220px]",
            cell: (s) => (
                <>
                    {s.href || <span className="text-gray-500 font-sans">Sin vínculo</span>}
                    {s.href && s.openInNewTab && <span className="block text-gray-500 font-sans">Nueva pestaña</span>}
                </>
            ),
        },
        {
            key: "active",
            header: "Visible",
            mobile: "badge",
            cell: (s) => (
                <button type="button" onClick={() => handleToggleActive(s)} className={toggleClass(s.active)}>
                    {s.active ? "Visible" : "Oculto"}
                </button>
            ),
        },
        {
            key: "actions",
            header: "",
            mobile: "actions",
            align: "right",
            className: "whitespace-nowrap",
            cell: (s) => (
                <div className="flex justify-end gap-2">
                <button type="button" onClick={() => openForm(s)} className={`${buttonClass.secondary} min-h-9 px-3 text-xs`}>
                    Editar
                </button>
                <button type="button" onClick={() => handleDelete(s)} className={`${buttonClass.danger} min-h-9 px-3 text-xs`}>
                    Eliminar
                </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => openForm()}
                    className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110 transition"
                >
                    + Nuevo banner
                </button>
            </div>

            <ResponsiveTable
                rows={slides}
                columns={columns}
                getRowKey={(s) => s.id}
                minWidth="760px"
                empty="No hay banners cargados: el carrusel no se muestra en la home."
            />

            {form && (
                <FormModal title={editingId ? "Editar banner" : "Nuevo banner"}>
                    <div className="space-y-5">
                        {/* Vista previa con la misma maqueta que la home */}
                        <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden bg-gray-800 border border-gray-700">
                            {form.image ? (
                                <HeroSlideContent
                                    image={form.image}
                                    title={form.title}
                                    subtitle={form.subtitle}
                                    ctaLabel={form.ctaLabel}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                                    Subí una imagen (proporción 21:9, ej. 2100×900 px)
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    openUploadWidget({
                                        multiple: false,
                                        aspectRatio: HERO_ASPECT_RATIO,
                                        cropTitle: "Recortar imagen (21:9 recomendado)",
                                    })
                                }
                                disabled={uploading}
                                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition"
                            >
                                {form.image ? "Cambiar imagen" : "Subir imagen"}
                            </button>
                            <button
                                type="button"
                                onClick={() => openMediaLibrary({ multiple: false })}
                                disabled={uploading}
                                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition"
                            >
                                Elegir de la biblioteca
                            </button>
                        </div>
                        {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="text-xs text-gray-400">
                                Título
                                <input
                                    type="text"
                                    value={form.title}
                                    maxLength={120}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className={inputClass}
                                />
                            </label>
                            <label className="text-xs text-gray-400">
                                Texto del botón
                                <input
                                    type="text"
                                    value={form.ctaLabel}
                                    maxLength={40}
                                    placeholder="Ver productos"
                                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                                    className={inputClass}
                                />
                            </label>
                            <label className="sm:col-span-2 text-xs text-gray-400">
                                Subtítulo
                                <input
                                    type="text"
                                    value={form.subtitle}
                                    maxLength={200}
                                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                                    className={inputClass}
                                />
                            </label>
                            <label className="sm:col-span-2 text-xs text-gray-400">
                                Vínculo
                                <input
                                    type="text"
                                    value={form.href}
                                    placeholder="/productos/ofertas o https://..."
                                    onChange={(e) => setForm({ ...form, href: e.target.value })}
                                    className={`${inputClass} font-mono`}
                                />
                                <span className="block mt-1 text-gray-500">
                                    Se abre al hacer click en cualquier parte del banner. Dejalo vacío
                                    para un banner sin vínculo.
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-5">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.openInNewTab}
                                    onChange={(e) =>
                                        setForm({ ...form, openInNewTab: e.target.checked })
                                    }
                                    className="accent-brand"
                                />
                                Abrir en una pestaña nueva
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                    className="accent-brand"
                                />
                                Visible en la home
                            </label>
                        </div>
                    </div>

                    <ModalFormFooter
                        message={error ? <span className="text-red-400">{error}</span> : null}
                    >
                        <button type="button" onClick={closeForm} className={buttonClass.ghost}>
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving || uploading || !form.image} className={buttonClass.primary}>
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </ModalFormFooter>
                </FormModal>
            )}
        </div>
    );
}
