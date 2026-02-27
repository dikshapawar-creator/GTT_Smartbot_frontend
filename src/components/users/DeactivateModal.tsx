import React, { useState } from "react";
import { AlertTriangle, Power } from "lucide-react";

interface DeactivateModalProps {
    userEmail: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeactivateModal({ userEmail, loading, onConfirm, onCancel }: DeactivateModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const isReady = confirmText === userEmail;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center">Deactivate User Account</h3>
                <p className="text-sm text-gray-500 text-center mt-2 mb-6 leading-relaxed">
                    This will immediately revoke access for <span className="font-semibold text-gray-900">{userEmail}</span>.
                    The user data will be preserved but they won&apos;t be able to log in.
                </p>

                <div className="mb-6">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Type the email to confirm
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={userEmail}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 px-4 py-2 bg-gray-50 border outline-none transition"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || !isReady}
                        className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                        ) : (
                            <><Power className="h-4 w-4" /> Deactivate</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
