import Link from "next/link";

import { CategoryDTO } from "@/types/shared/category";

interface Props {
    category: CategoryDTO;
    categories: CategoryDTO[];
}

export function MegaMenu({ category, categories }: Props) {
    const level1 = categories.filter((c) => c.parentId === category.id);

    return (
        <div className="absolute top-full left-0 w-[900px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-6">
            <div className="grid grid-cols-4 gap-8">
                {level1.map((group) => {
                    const children = categories.filter(
                        (c) => c.parentId === group.id,
                    );

                    return (
                        <div key={group.id}>
                            <Link
                                href={`/productos/categoria/${group.slug}`}
                                className="font-semibold text-white mb-3 block hover:text-brand"
                            >
                                {group.name}
                            </Link>

                            <div className="space-y-2">
                                {children.map((child) => (
                                    <Link
                                        key={child.id}
                                        href={`/productos/categoria/${child.slug}`}
                                        className="block text-sm text-gray-400 hover:text-white"
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
