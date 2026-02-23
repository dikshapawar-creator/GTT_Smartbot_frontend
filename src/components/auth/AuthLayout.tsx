"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthLayoutProps {
    children: React.ReactNode;
    subtitle?: string;
    rightPanelContent: React.ReactNode;
}

export default function AuthLayout({ children, rightPanelContent }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Side — subtle gradient bg */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-gradient-to-br from-gray-50 to-gray-100">

                <div className="w-full max-w-[480px] flex flex-col gap-8">
                    {/* Logo — above the card */}
                    <Link href="/" className="inline-flex items-center">
                        <Image
                            src="/logo.png"
                            alt="GTD Service"
                            width={140}
                            height={40}
                            className="h-10 w-auto object-contain"
                            priority
                        />
                    </Link>

                    {/* White Card — auto height, never clips */}
                    <div className="w-full bg-white rounded-2xl shadow-2xl px-10 py-10 animate-slideUp">
                        {children}
                    </div>

                    {/* Footer */}
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-center">
                        © 2026 GTD Service • Enterprise Trade Data Intelligence
                    </p>
                </div>
            </div>

            {/* Right Side: Brand Panel */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-900 via-blue-950 to-black text-white p-[100px] flex-col justify-center space-y-10 relative overflow-hidden">
                {/* Depth overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none z-0" />

                <div className="relative z-10 w-full max-w-lg space-y-8">
                    <span className="inline-block px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[10px] font-semibold tracking-widest uppercase backdrop-blur-md border border-white/10">
                        Enterprise EXIM Platform
                    </span>
                    <h2 className="text-5xl font-bold text-white tracking-tight leading-[1.15]">
                        Advanced Trade Intelligence
                    </h2>
                    <p className="text-lg text-blue-100/75 leading-relaxed">
                        Streamline import-export operations, lead management, and global trade analytics with real-time insights and enterprise-grade security.
                    </p>
                </div>

                <div className="relative z-10 space-y-4">
                    {rightPanelContent}
                </div>
            </div>
        </div>
    );
}
