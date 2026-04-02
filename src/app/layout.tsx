import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Chatbot',
  description: 'Manage AI-powered chatbot operations, lead generation, and intelligence with the Smart Chatbot platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
      </body>

    </html>
  );
}
