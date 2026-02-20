import LeadsList from '@/components/Dashboard/LeadsList';

export const metadata = {
    title: 'Leads Management — AI Trade CRM',
    description: 'Manage and track enterprise leads captured via GTT SmartBot.',
};

import Chatbot from '@/components/Chatbot/Chatbot';

export default function LeadsPage() {
    return (
        <>
            <LeadsList />
            <Chatbot />
        </>
    );
}

