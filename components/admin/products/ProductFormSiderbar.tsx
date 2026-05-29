"use client";

import { CategoryTree } from "@/components/admin/products/components/CategoryTree";

import { ImageUploader } from "@/components/admin/products/components/ImageUploader";

import type { CategoryDTO } from "@/types/shared/category";

import type { BrandDTO } from "@/types/shared/brand";

interface Props {
    mode: "create" | "edit";

    product?: any;

    loading: boolean;

    deleting: boolean;

    error: string | any[] | null;

    success: string;

    fieldErrors: Record<string, string>;

    categories: CategoryDTO[];

    brands: BrandDTO[];

    form: any;

    image: string;

    images: string[];

    onImageChange: (data: { image: string; images: string[] }) => void;

    onCategoryToggle: (id: string) => void;

    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;

    onDelete: () => void;

    onSubmit: () => void;

    onOpenCreateBrand: () => void;
}

export const ProductFormSidebar = ({
    mode,
    product,

    loading,
    deleting,

    error,
    success,

    fieldErrors,

    categories,
    brands,

    form,

    image,
    images,

    onImageChange,

    onCategoryToggle,

    onChange,

    onDelete,

    onSubmit,

    onOpenCreateBrand,
}: Props) => {
    const inputClass = `
        w-full
        bg-gray-800
        text-white
        text-sm
        rounded-lg
        px-4
        py-3
        border
        border-gray-700
        focus:border-brand
        outline-none
        transition-colors
    `;

    const labelClass = `
        text-sm
        text-gray-400
        mb-1
        block
    `;

    return (
        <div className="flex flex-col gap-4">
            {/* PUBLICACIÓN */}

            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-4">
                    Publicación
                </h2>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className={labelClass}>Estado</label>

                        <select
                            name="status"
                            value={form.status}
                            onChange={onChange}
                            className={inputClass}
                        >
                            <option value="publish">Publicado</option>

                            <option value="draft">Borrador</option>

                            <option value="private">Privado</option>
                        </select>
                    </div>

                    {error &&
                        (Array.isArray(error) ? (
                            error.map((e, i) => (
                                <p key={i} className="text-sm text-red-400">
                                    {e.message}
                                </p>
                            ))
                        ) : (
                            <p className="text-sm text-red-400">{error}</p>
                        ))}

                    {success && (
                        <p className="text-sm text-green-400">{success}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        onClick={onSubmit}
                        className="
                            w-full
                            py-3
                            rounded-xl
                            text-white
                            font-medium
                            bg-brand
                            hover:brightness-110
                            disabled:opacity-50
                            transition-all
                        "
                    >
                        {loading
                            ? "Guardando..."
                            : mode === "edit"
                              ? "Guardar cambios"
                              : "Crear producto"}
                    </button>

                    {mode === "edit" && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={deleting}
                            className="
                                w-full
                                py-2.5
                                rounded-xl
                                text-red-400
                                text-sm
                                font-medium
                                border
                                border-red-400/20
                                hover:bg-red-400/10
                                disabled:opacity-50
                                transition-all
                            "
                        >
                            {deleting ? "Eliminando..." : "Eliminar producto"}
                        </button>
                    )}

                    {mode === "edit" && (
                        <a
                            href={`/products/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                                w-full
                                py-2.5
                                rounded-xl
                                text-gray-400
                                text-sm
                                text-center
                                hover:text-white
                                transition-colors
                            "
                        >
                            Ver en tienda →
                        </a>
                    )}
                </div>
            </section>

            {/* IMÁGENES */}

            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-4">
                    Imágenes
                </h2>

                <ImageUploader
                    image={image}
                    images={images}
                    onChange={onImageChange}
                />
            </section>

            {/* CATEGORÍAS */}

            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-4">
                    Categorías
                </h2>

                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    <CategoryTree
                        categories={categories}
                        selectedCategories={form.categories}
                        onToggle={onCategoryToggle}
                    />
                </div>

                {fieldErrors.categories && (
                    <p className="text-sm text-red-400">
                        {fieldErrors.categories}
                    </p>
                )}
            </section>

            {/* MARCAS */}

            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">Marcas</h2>

                    <button
                        type="button"
                        onClick={onOpenCreateBrand}
                        className="
                            px-3
                            py-1.5
                            rounded-lg
                            bg-brand
                            text-white
                            text-sm
                            hover:brightness-110
                            transition-all
                        "
                    >
                        Nueva marca
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <select
                        name="brand"
                        value={form.brand}
                        onChange={onChange}
                        className={inputClass}
                    >
                        <option value="">Seleccionar marca</option>

                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>
                </div>

                {fieldErrors.brand && (
                    <p className="text-sm text-red-400 mt-2">
                        {fieldErrors.brand}
                    </p>
                )}
            </section>
        </div>
    );
};
