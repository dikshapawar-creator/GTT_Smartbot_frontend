export const metadata = {
    title: 'Shipments — GTD Service',
    description: 'Track and manage global shipments.',
};

export default function ShipmentsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
            <div className="text-5xl">🚢</div>
            <h2 className="text-2xl font-bold text-gray-800">Shipments</h2>
            <p className="text-gray-500 max-w-sm">Track, manage, and monitor all active and historical shipments across global trade routes.</p>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">Coming Soon</span>
        </div>
    );
}
