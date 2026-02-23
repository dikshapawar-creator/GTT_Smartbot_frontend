import Dashboard from '@/components/Dashboard/Dashboard';
import Chatbot from '@/components/Chatbot/Chatbot';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Dashboard>{children}</Dashboard>
            <Chatbot />
        </>
    );
}
