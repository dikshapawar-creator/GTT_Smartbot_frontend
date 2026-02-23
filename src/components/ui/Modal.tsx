import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleEscape);
        }
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div
                className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={cn(
                "relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border animate-fadeInUp overflow-hidden",
                className
            )}>
                <div className="flex items-center justify-between p-6 border-b bg-surface-secondary/10">
                    <h3 className="text-xl font-bold text-text-primary">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
