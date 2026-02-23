import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GTD Service — Enterprise Import & Export Management Platform',
  description: 'Manage global trade operations, shipments, and intelligence with the GTD Service ecosystem.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>

    </html>
  );
}
