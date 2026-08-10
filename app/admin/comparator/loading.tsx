export default function Loading() {
    return (
        <div className="p-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium">
                Fetching distributor catalogs...
            </p>
        </div>
    );
}
