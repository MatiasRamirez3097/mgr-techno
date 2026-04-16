export type CategoryDTO = {
    id: string;
    image: string;
    name: string;
    slug: string;
};

export type GetCategoriesResponse = {
    categories: CategoryDTO[];
    totalPages: number;
    total: number;
};

export type CategoryFilters {
    name: string;
    search?: string;
    page?: number;
}
