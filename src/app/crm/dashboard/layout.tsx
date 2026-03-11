import Dashboard from '@/components/Dashboard/Dashboard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Dashboard>{children}</Dashboard>
    );
}
