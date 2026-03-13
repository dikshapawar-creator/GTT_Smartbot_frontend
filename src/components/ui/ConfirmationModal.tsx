"use client";

import { AlertTriangle, Info } from "lucide-react";

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: "danger" | "info";
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    variant = "info",
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const isDanger = variant === "danger";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                onClick={onCancel}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isDanger ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                            }`}>
                            {isDanger ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-[1.5] px-4 py-2.5 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-sm font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                            ) : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
