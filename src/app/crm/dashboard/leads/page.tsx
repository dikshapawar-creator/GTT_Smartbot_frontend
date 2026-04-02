import LeadsList from '@/components/Dashboard/LeadsList';

export const metadata = {
    title: 'Captured Leads — Smart Chatbot',
    description: 'Manage enterprise leads captured via the Smart Chatbot.',
};

export default function LeadsPage() {
    return <LeadsList />;
}
