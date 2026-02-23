import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    children: React.ReactNode;
}

export default function GradientButton({ children, isLoading, className, ...props }: GradientButtonProps) {
    return (
        <button
            className={cn(
                "w-full h-12 rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 text-white font-semibold text-sm tracking-wide shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2",
                className
            )}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}
