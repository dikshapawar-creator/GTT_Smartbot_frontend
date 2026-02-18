import type { Metadata } from 'next';
import './globals.css';
import Chatbot from '@/components/Chatbot/Chatbot';

export const metadata: Metadata = {
  title: 'TradeFlow CRM — Enterprise Import & Export Management Platform',
  description: 'End-to-end trade operations management for global businesses. Manage shipments, documentation, compliance, and client operations across global trade routes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
