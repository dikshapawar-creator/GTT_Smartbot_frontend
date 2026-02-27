import React, { useState } from "react";
import { Shield, Check } from "lucide-react";
import { User, UserRole, getRoleName } from "./types";

interface ChangeRoleModalProps {
    user: User;
    roles: UserRole[];
    onConfirm: (roleName: string) => void;
    onCancel: () => void;
    loading: boolean;
}

export function ChangeRoleModal({ user, roles, onConfirm, onCancel, loading }: ChangeRoleModalProps) {
    const [selectedRole, setSelectedRole] = useState(getRoleName(user));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center">Change User Role</h3>
                <p className="text-sm text-gray-500 text-center mt-1.5 mb-6">
                    Select a new role for <span className="font-medium text-gray-900">{user.email}</span>
                </p>

                <div className="space-y-3 mb-6">
                    {roles.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRole(r.name)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedRole === r.name
                                ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
                                : "bg-white border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <span className="text-sm font-medium text-gray-700 capitalize">{r.name.replace(/_/g, ' ')}</span>
                            {selectedRole === r.name && <Check className="h-4 w-4 text-blue-600" />}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition border border-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(selectedRole)}
                        disabled={loading || selectedRole === getRoleName(user)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Updating..." : "Update Role"}
                    </button>
                </div>
            </div>
        </div>
    );
}
