'use client';

import { useEffect } from 'react';
import Chatbot from '@/components/Chatbot/Chatbot';

export default function WidgetPage() {
  useEffect(() => {
    // Force html and body to be transparent so the host site's background shows through
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, []);

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: '20px'
    }}>
      <Chatbot />
    </main>
  );
}
