'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Zap, ShieldAlert, Activity } from 'lucide-react';
import api from '@/config/api';

export default function SettingsPage() {
    const [analytics, setAnalytics] = useState({
        active_visitors: 0,
        avg_lead_score: 0,
        spam_visitors: 0,
        agent_chats: 0
    });

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await api.get('/live-chat/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        }
    }, []);

    useEffect(() => {
        const loadAnalytics = async () => {
            await fetchAnalytics();
        };
        loadAnalytics();
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Platform Settings</h1>
                <p className="text-slate-500 text-lg">Manage your account and monitor platform performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <Users size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Visitors</div>
                    <div className="text-3xl font-bold text-slate-900">{analytics.active_visitors}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                        <Zap size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Lead Score</div>
                    <div className="text-3xl font-bold text-slate-900">{Math.round(analytics.avg_lead_score)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
                        <ShieldAlert size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Spam Flags</div>
                    <div className="text-3xl font-bold text-slate-900">{analytics.spam_visitors}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <Activity size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Agent Chats</div>
                    <div className="text-3xl font-bold text-slate-900">{analytics.agent_chats}</div>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Account Configuration</h2>
                <p className="text-slate-500 max-w-sm mx-auto mb-6">Security policies, API integrations, and team preferences management is currently under maintenance.</p>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">Coming Soon</span>
            </div>
        </div>
    );
}
