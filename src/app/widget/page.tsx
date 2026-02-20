'use client';

import Chatbot from '@/components/Chatbot/Chatbot';

export default function WidgetPage() {
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
