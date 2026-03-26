import Dashboard from '@/components/Dashboard/Dashboard';
import { TenantProvider } from '@/context/TenantContext';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
    return (
        <TenantProvider>
            <Dashboard>{children}</Dashboard>
        </TenantProvider>
    );
}
