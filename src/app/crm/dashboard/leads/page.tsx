import LeadsList from '@/components/Dashboard/LeadsList';

export const metadata = {
    title: 'Captured Leads — GTD Service',
    description: 'Manage enterprise leads captured via the SmartBot.',
};

export default function LeadsPage() {
    return <LeadsList />;
}
