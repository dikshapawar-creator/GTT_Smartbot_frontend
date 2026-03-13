import React, { useState } from "react";
import { AlertTriangle, Power, X } from "lucide-react";

interface DeactivateModalProps {
    userEmail: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeactivateModal({ userEmail, loading, onConfirm, onCancel }: DeactivateModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const isReady = confirmText.toLowerCase() === userEmail.toLowerCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onCancel}
            />

            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Visual Danger Indicator */}
                <div className="h-2 bg-gradient-to-r from-red-500 via-rose-600 to-red-500" />

                <div className="p-8 pt-6">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center border-2 border-red-100 shadow-sm">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 text-center tracking-tight leading-none mb-2">
                        Deactivate User
                    </h3>
                    <p className="text-sm font-medium text-slate-500 text-center px-4 leading-relaxed mb-8">
                        This will revoke access for <span className="text-slate-900 font-bold">{userEmail}</span>.
                    </p>

                    <div className="space-y-3 mb-8">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-center">
                            Confirm Email Address
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={userEmail}
                            className={`w-full h-12 px-5 rounded-xl border-2 transition-all outline-none font-bold text-sm text-center
                                ${isReady
                                    ? "border-emerald-500 bg-emerald-50/20"
                                    : "border-slate-100 bg-slate-50 focus:border-red-500 focus:bg-white"
                                }`}
                        />
                        <p className="text-[10px] text-slate-400 font-bold text-center italic">
                            Type the email exactly to proceed.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-4 rounded-xl text-sm font-bold text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading || !isReady}
                            className="flex-[1.5] py-4 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-sm font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Power className="h-5 w-5" />
                                    <span>DEACTIVATE</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
