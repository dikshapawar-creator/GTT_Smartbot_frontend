import React, { useState } from "react";
import { Shield, Edit3, Trash2, Check, X, Lock } from "lucide-react";
import { UserRole, LEVEL_COLORS } from "./types";

interface RolesTableProps {
    roles: UserRole[];
    isLoading: boolean;
    onEdit: (role: UserRole, updates: Partial<UserRole>) => void;
    onDelete: (id: number) => void;
}

export function RolesTable({ roles, isLoading, onEdit, onDelete }: RolesTableProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; description: string }>({ name: "", description: "" });

    const startEdit = (role: UserRole) => {
        setEditingId(role.id);
        setEditForm({ name: role.name, description: role.description || "" });
    };

    const commitEdit = (role: UserRole) => {
        onEdit(role, { name: editForm.name, description: editForm.description });
        setEditingId(null);
    };

    if (isLoading && roles.length === 0) {
        return (
            <div className="bg-white p-20 flex flex-col items-center justify-center min-h-[400px]">
                <div className="h-10 w-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Loading Security Framework...</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                    <tr className="border-b border-slate-50">
                        {["NAME", "LEVEL", "DESCRIPTION", "ROLE TYPE", "SETTINGS"].map(h => (
                            <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {roles.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-24 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                        <Shield className="h-8 w-8 opacity-20" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-400 mb-1">NO ROLES DETECTED</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        roles.map((role) => {
                            const isSystem = ["administrator", "manager", "sales", "employee"].includes(role.name.toLowerCase());

                            return (
                                <tr key={role.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        {editingId === role.id ? (
                                            <input
                                                value={editForm.name}
                                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                className="h-9 border border-indigo-200 rounded-lg px-3 text-sm font-bold focus:outline-none focus:border-indigo-500 w-44 bg-white transition-all shadow-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black
                                                    ${LEVEL_COLORS[role.level] ?? LEVEL_COLORS[1]}`}>
                                                    {role.name.slice(0, 1).toUpperCase()}
                                                </div>
                                                <span className="text-[13px] font-semibold text-slate-800 capitalize tracking-wide">{role.name.replace(/_/g, " ")}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border border-black/5 ${LEVEL_COLORS[role.level] ?? LEVEL_COLORS[1]}`}>
                                            Level {role.level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium text-[12px]">
                                        {editingId === role.id ? (
                                            <input
                                                value={editForm.description}
                                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="Responsibility…"
                                                className="h-9 border border-slate-200 rounded-lg px-3 text-sm font-medium focus:outline-none focus:border-indigo-500 w-64 bg-white transition-all"
                                            />
                                        ) : (
                                            <span className="line-clamp-1">{role.description || "—"}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {isSystem ? (
                                                <><Lock className="h-3.5 w-3.5 opacity-60" /> System</>
                                            ) : (
                                                <><Shield className="h-3.5 w-3.5 opacity-60" /> Custom</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            {editingId === role.id ? (
                                                <>
                                                    <button onClick={() => commitEdit(role)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all">
                                                        <Check className="h-4 w-4 stroke-[3px]" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all">
                                                        <X className="h-4 w-4 stroke-[3px]" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(role)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all">
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    {!isSystem && (
                                                        <button onClick={() => onDelete(role.id)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
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
    );
}
