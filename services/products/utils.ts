export const getMongoSort = (orderby?: string) => {
    switch (orderby) {
        case "price-asc":
            return {
                price: 1,
            };

        case "price-desc":
            return {
                price: -1,
            };

        case "name-asc":
            return {
                name: 1,
            };

        case "name-desc":
            return {
                name: -1,
            };

        case "newest":
            return {
                createdAt: -1,
            };

        case "oldest":
            return {
                createdAt: 1,
            };

        default:
            return {
                createdAt: -1,
            };
    }
};
