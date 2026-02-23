"use client";

import React from "react";

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div className="space-y-1">
                    <h4 className="text-white font-bold text-sm leading-tight tracking-wide">{title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
