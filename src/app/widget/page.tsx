'use client';

import { useEffect } from 'react';
import Chatbot from '@/components/Chatbot/Chatbot';

export default function WidgetPage() {
  useEffect(() => {
    // Make page fully transparent and click-through
    document.documentElement.style.cssText = 'background:transparent;overflow:hidden;';
    document.body.style.cssText = 'background:transparent;overflow:hidden;margin:0;padding:0;pointer-events:none;';
  }, []);

  return (
    // Full-screen shell — NO pointer events (clicks pass to host site)
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'transparent',
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {/*
        Chatbot.tsx already uses position:fixed internally for .fabWrapper and .panel
        so NO additional fixed wrapper needed here — just restore pointer-events.
      */}
      <div style={{ pointerEvents: 'auto' }}>
        <Chatbot />
      </div>
    </div>
  );
}
