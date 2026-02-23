export const metadata = {
    title: 'Documents — GTD Service',
    description: 'Manage trade documents, invoices, and compliance files.',
};

export default function DocsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
            <div className="text-5xl">📄</div>
            <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
            <p className="text-gray-500 max-w-sm">Upload, manage, and share trade documents, compliance files, and invoices securely.</p>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">Coming Soon</span>
        </div>
    );
}
