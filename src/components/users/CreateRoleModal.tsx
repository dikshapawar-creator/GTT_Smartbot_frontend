import { useState } from "react";
import { X, Plus, Shield, Layers, Info, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

type Role = {
    id: number;
    name: string;
    description?: string;
    level: number;
    userCount?: number;
};

export function CreateRoleModal({ onClose, onCreated, showToast }: {
    onClose: () => void;
    onCreated: (role: Role) => void;
    showToast: (m: string, t: "success" | "error") => void;
}) {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [level, setLevel] = useState(1);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setErr("Role name is required"); return; }
        setLoading(true);
        try {
            const { data } = await api.post<Role>("/roles/", {
                name: name.trim().toLowerCase(),
                description: desc.trim(),
                level: Number(level)
            });
            onCreated(data);
            showToast(`Role "${data.name}" created successfully`, "success");
            onClose();
        } catch (error) {
            showToast((error as Error).message || "Failed to create role", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />

            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="relative px-8 pt-8 pb-6 shrink-0">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-8 -mt-8" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">New System Role</h3>
                                <p className="text-sm font-medium text-slate-500 mt-0.5">Define access level & permissions</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all active:scale-90"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="px-8 py-2 space-y-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                            Role Tag <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); setErr(""); }}
                                placeholder="e.g. support_lead"
                                className={`w-full h-12 px-4 rounded-xl border-2 outline-none transition-all duration-200 text-slate-900 font-medium
                                    ${err
                                        ? "border-red-100 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                        : "border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    }`}
                            />
                            {err && <p className="text-xs font-bold text-red-500 mt-1.5 px-1">{err}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                            <Layers className="h-4 w-4 text-blue-500" />
                            Hierarchy Level
                        </label>
                        <div className="relative group">
                            <select
                                value={level}
                                onChange={(e) => setLevel(Number(e.target.value))}
                                className="w-full h-12 pl-4 pr-12 rounded-xl border-2 border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all appearance-none text-slate-900 font-medium cursor-pointer"
                            >
                                <option value={1}>Level 1: Staff Access</option>
                                <option value={2}>Level 2: Management</option>
                                <option value={3}>Level 3: Executive Admin</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 px-1">
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Higher levels can manage lower levels</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                            Brief Description
                        </label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            rows={3}
                            placeholder="What are the responsibilities?"
                            className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm font-medium text-slate-900 resize-none"
                        />
                    </div>
                </form>

                <div className="px-8 py-8 mt-4 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={submit}
                        disabled={loading}
                        className="flex-[1.5] py-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-black shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                <span>CREATE ROLE</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
