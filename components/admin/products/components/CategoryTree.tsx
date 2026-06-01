"use client";

import React from "react";

import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    categories: CategoryDTO[];

    selectedCategories: string[];

    onToggle: (id: string) => void;

    parentId?: string | null;

    level?: number;
}

export function CategoryTree({
    categories,
    selectedCategories,
    onToggle,
    parentId = null,
    level = 0,
}: Props) {
    const filtered = categories.filter((category) =>
        parentId === null ? !category.parentId : category.parentId === parentId,
    );

    if (filtered.length === 0) {
        return null;
    }

    return (
        <>
            {filtered.map((category) => (
                <div key={category.id}>
                    <label
                        className="
                            flex
                            items-center
                            gap-2.5
                            py-1
                            cursor-pointer
                        "
                        style={{
                            paddingLeft: level * 16,
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => onToggle(category.id)}
                            className="
                                w-4
                                h-4
                                accent-brand
                            "
                        />

                        <span
                            className={
                                level === 0
                                    ? "text-sm text-white font-medium"
                                    : "text-sm text-gray-300"
                            }
                        >
                            {category.name}
                        </span>
                    </label>

                    <CategoryTree
                        categories={categories}
                        selectedCategories={selectedCategories}
                        onToggle={onToggle}
                        parentId={category.id}
                        level={level + 1}
                    />
                </div>
            ))}
        </>
    );
}
