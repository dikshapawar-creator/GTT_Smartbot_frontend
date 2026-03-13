import React from "react";
import { Shield, Lock, Edit2, Trash2 } from "lucide-react";
import { UserRole } from "./types";

interface RolesTableProps {
    roles: UserRole[];
    isLoading: boolean;
    onEdit: (role: UserRole) => void;
    onDelete: (id: number) => void;
}

const ROLE_UI_CONFIG: Record<string, { bg: string, color: string }> = {
    administrator: { bg: "bg-purple-100", color: "text-purple-600" },
    manager: { bg: "bg-blue-100", color: "text-blue-600" },
    sales: { bg: "bg-green-100", color: "text-green-600" },
    employee: { bg: "bg-gray-100", color: "text-gray-600" },
};

export function RolesTable({ roles, isLoading, onEdit, onDelete }: RolesTableProps) {
    if (isLoading && roles.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Loading roles...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#F9FAFB] border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Level</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Role Type</th>
                            <th className="px-6 py-4 text-right">Settings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No roles found.
                                </td>
                            </tr>
                        ) : (
                            roles.map((role) => {
                                const ui = ROLE_UI_CONFIG[role.name.toLowerCase()] || ROLE_UI_CONFIG.employee;
                                const isSystem = ["administrator", "manager", "sales", "employee"].includes(role.name.toLowerCase());

                                return (
                                    <tr key={role.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`${ui.bg} rounded-xl p-2 shrink-0 border border-black/5`}>
                                                    <Shield className={`h-4 w-4 ${ui.color}`} />
                                                </div>
                                                <span className="font-semibold text-gray-900 capitalize tracking-wide">{role.name.replace(/_/g, " ")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-100">
                                                Level {role.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm max-w-md truncate">
                                            {role.description || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isSystem ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 tracking-wide">
                                                    <Lock className="h-3 w-3 opacity-60" /> System Role
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 tracking-wide">
                                                    Custom Role
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100">
                                                <button
                                                    onClick={() => onEdit(role)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 rounded-xl transition-all border border-slate-100"
                                                    title="Edit Role"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {!isSystem && (
                                                    <button
                                                        onClick={() => onDelete(role.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all border border-slate-100"
                                                        title="Delete Role"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
