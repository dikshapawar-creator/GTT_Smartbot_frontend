'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import './widget.css';
import Chatbot from '@/components/Chatbot/Chatbot';

/**
 * Chatbot Widget Entry Point
 * Supports multi-tenancy via 'tid' query parameter.
 * Usage: /widget?tid=4
 */
function Widget() {
  const searchParams = useSearchParams();
  const tid = searchParams.get('tid');
  const key = searchParams.get('key');

  return (
    <div className="widget-root">
      {/* 
        Pass tid and key to Chatbot. The Chatbot component will use this 
        to fetch tenant-specific branding and scope its API calls.
      */}
      <Chatbot
        tenantIdProp={tid ? parseInt(tid) : undefined}
        tenantKeyProp={key || undefined}
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100" />
          <div className="h-2 w-20 bg-slate-50 rounded" />
        </div>
      </div>
    }>
      <Widget />
    </Suspense>
  );
}
