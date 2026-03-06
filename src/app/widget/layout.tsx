// Widget layout - intentionally minimal, no html/body wrapping (root layout handles that)
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
