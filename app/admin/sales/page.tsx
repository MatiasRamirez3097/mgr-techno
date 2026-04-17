interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminSalesPage({ searchParams }: Props) {
    return <div></div>;
}
