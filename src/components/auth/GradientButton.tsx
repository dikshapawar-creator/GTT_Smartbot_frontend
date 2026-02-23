import React from "react";
import { Loader2 } from "lucide-react";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    children: React.ReactNode;
}

export default function GradientButton({ children, isLoading, style, ...props }: GradientButtonProps) {
    return (
        <button
            style={{
                width: '100%',
                height: '50px',
                borderRadius: '12px',
                background: 'linear-gradient(to right, #1e40af, #0f172a)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.025em',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(30, 64, 175, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: isLoading || props.disabled ? 0.7 : 1,
                pointerEvents: isLoading || props.disabled ? 'none' : 'auto',
                ...style,
            }}
            disabled={isLoading || props.disabled}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(30, 64, 175, 0.5)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(30, 64, 175, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            {...props}
        >
            {isLoading && <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />}
            {children}
        </button>
    );
}
