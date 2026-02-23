"use client";

import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    rightAction?: React.ReactNode;
}

export default function InputField({ label, error, rightAction, style, ...props }: InputFieldProps) {
    const id = React.useId();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <label
                htmlFor={id}
                style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#000000',
                }}
            >
                {label}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    id={id}
                    style={{
                        width: '100%',
                        height: '50px',
                        padding: '0 16px',
                        paddingRight: rightAction ? '48px' : '16px',
                        borderRadius: '12px',
                        border: error ? '2px solid #ef4444' : '2px solid #d1d5db',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '15px',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        ...style,
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#1d4ed8';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.15)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = error ? '#ef4444' : '#d1d5db';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                    }}
                    {...props}
                />
                {rightAction && (
                    <div style={{ position: 'absolute', right: '12px' }}>
                        {rightAction}
                    </div>
                )}
            </div>
            {error && (
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', margin: 0 }}>{error}</p>
            )}
        </div>
    );
}
