export function FormModal({ children }) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
                <h2 className="text-lg font-bold text-white mb-4">
                    Nuevo proveedor
                </h2>
                {children}
            </div>
        </div>
    );
}
/*
<SupplierForm
                onSuccess={(supplier) => {
                    setSuppliers((prev) => [...prev, supplier]);

                    setForm((prev) => ({
                        ...prev,
                        supplierId: supplier.id,
                    }));

                    setShowSupplierModal(false);
                }}
                onCancel={() => setShowSupplierModal(false)}
            />
*/
