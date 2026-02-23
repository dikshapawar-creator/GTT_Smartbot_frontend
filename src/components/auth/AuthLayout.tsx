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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
            {/* Left Side */}
            <div style={{
                width: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            }}>
                <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Logo */}
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Image
                            src="/logo.png"
                            alt="GTD Service"
                            width={140}
                            height={40}
                            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                            priority
                        />
                    </Link>

                    {/* White Card */}
                    <div style={{
                        width: '100%',
                        background: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.03)',
                        padding: '48px 40px',
                    }} className="animate-slideUp">
                        {children}
                    </div>

                    {/* Footer */}
                    <p style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#9ca3af',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                    }}>
                        © 2026 GTD Service • Enterprise Trade Data Intelligence
                    </p>
                </div>
            </div>

            {/* Right Side: Brand Panel */}
            <div style={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '100px',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #000000 100%)',
                color: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Depth overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent, transparent)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }} />

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(255,255,255,0.1)',
                        width: 'fit-content',
                    }}>
                        Enterprise EXIM Platform
                    </span>
                    <h2 style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: '#ffffff',
                        letterSpacing: '-0.025em',
                        lineHeight: 1.15,
                        margin: 0,
                    }}>
                        Advanced Trade Intelligence
                    </h2>
                    <p style={{
                        fontSize: '18px',
                        color: 'rgba(191, 219, 254, 0.7)',
                        lineHeight: 1.7,
                        margin: 0,
                    }}>
                        Streamline import-export operations, lead management, and global trade analytics with real-time insights and enterprise-grade security.
                    </p>
                </div>

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '40px' }}>
                    {rightPanelContent}
                </div>
            </div>
        </div>
    );
}
