export type AttributeInputType =
    | "select"
    | "multiselect"
    | "number"
    | "boolean"
    | "text";

export type CategoryAttributeDefinitionDTO = {
    key: string;
    label: string;
    type: AttributeInputType;
    options?: string[];
    unit?: string;
    required?: boolean;
    filterable?: boolean;
};

export type CategoryDTO = {
    id: string;
    image: string;
    name: string;
    parentId: string | null;
    slug: string;
    menuOrder: number;
    attributeDefinitions?: CategoryAttributeDefinitionDTO[];
};

export type GetCategoriesResponse = {
    categories: CategoryDTO[];
    totalPages: number;
    total: number;
};

export type CategoryFilters = {
    name: string;
    search?: string;
    page?: number;
};
