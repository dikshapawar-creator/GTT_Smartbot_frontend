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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-10 pt-10 pb-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Role</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Security framework</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-all active:scale-90">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="px-10 pb-6 space-y-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                            Role Identifier <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={(e) => { setName(e.target.value); setErr(""); }}
                            placeholder="e.g. support_lead"
                            className={`w-full h-12 px-5 rounded-2xl border-2 outline-none text-sm font-bold transition-all
                                ${err ? "border-rose-200 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 focus:border-slate-900 focus:bg-white"}`}
                        />
                        {err && <p className="text-[11px] font-bold text-rose-600 px-1">{err}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Hierarchy Level
                        </label>
                        <div className="relative group">
                            <select
                                value={level}
                                onChange={(e) => setLevel(Number(e.target.value))}
                                className="w-full h-12 pl-5 pr-12 rounded-2xl border-2 border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-slate-900 focus:bg-white text-sm font-bold appearance-none cursor-pointer outline-none transition-all shadow-sm"
                            >
                                <option value={1}>Level 1: Staff Access</option>
                                <option value={2}>Level 2: Management</option>
                                <option value={3}>Level 3: Executive Admin</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 pointer-events-none transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-2 text-center p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 border-dashed">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Info className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Protocol Note</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 px-2 leading-relaxed">Higher levels can automatically deactivate and manage lower levels across the entire system.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                            Role Description
                        </label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            rows={3}
                            placeholder="Permissions summary…"
                            className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:border-slate-900 focus:bg-white text-sm font-bold transition-all outline-none resize-none"
                        />
                    </div>
                </form>

                <div className="px-10 py-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                    <button type="button" onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest">
                        Cancel
                    </button>
                    <button onClick={submit} disabled={loading}
                        className="flex-[1.8] px-6 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-50">
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                <span className="uppercase tracking-widest">AUTHORIZE ROLE</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
