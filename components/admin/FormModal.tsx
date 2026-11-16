type Props = {
    children: React.ReactNode;
    title: string;
};

export function FormModal({ children, title }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4">
            <div className="w-full max-w-3xl overflow-y-auto border-gray-800 bg-gray-900 p-4 sm:max-h-[90vh] sm:rounded-2xl sm:border sm:p-6">
                <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}
