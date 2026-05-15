type Props = {
    children: React.ReactNode;
    title: string;
};

export function FormModal({ children, title }: Props) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-3xl border border-gray-800">
                <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}
