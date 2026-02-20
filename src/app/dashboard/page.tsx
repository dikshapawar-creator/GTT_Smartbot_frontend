import Dashboard from '@/components/Dashboard/Dashboard';

export const metadata = {
    title: 'Dashboard — AI Trade CRM',
    description: 'Enterprise CRM dashboard for global trade operations.',
};

import Chatbot from '@/components/Chatbot/Chatbot';

export default function DashboardPage() {
    return (
        <>
            <Dashboard />
            <Chatbot />
        </>
    );
}

