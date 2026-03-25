"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Building, Plus, Search,
    Trash2, X, Check, RefreshCw, AlertTriangle,
    CheckCheck, Globe, Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard/Dashboard";

// -- Types --
type Tenant = {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

// -- Helpers --
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// -- Toast --
function ToastBar({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[300] flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right duration-200 min-w-[280px]
                    ${t.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : t.type === "error" ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}>
                    {t.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                    <span className="text-xs font-bold flex-1">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
                </div>
            ))}
        </div>
    );
}

// -- Page --
export default function TenantManagementPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", description: "" });
    const [createLoading, setCreateLoading] = useState(false);

    const toast = useCallback((message: string, type: Toast["type"] = "success") => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    }, []);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<Tenant[]>("/super-admin/tenants");
            setTenants(data);
        } catch {
            toast("Failed to load tenants", "error");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!auth.isSuperAdmin()) {
            window.location.href = "/crm/dashboard";
            return;
        }
        fetchTenants();
    }, [fetchTenants]);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name.trim()) return toast("Name is required", "error");
        setCreateLoading(true);
        try {
            const { data } = await api.post<Tenant>("/super-admin/create-tenant", {
                name: createForm.name.trim(),
                description: createForm.description.trim()
            });
            setTenants([data, ...tenants]);
            toast(`Workspace "${data.name}" created`);
            setShowCreate(false);
            setCreateForm({ name: "", description: "" });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to create workspace";
            toast(msg, "error");
        } finally {
            setCreateLoading(false);
        }
    };

    const toggleStatus = async (tenant: Tenant) => {
        try {
            await api.patch(`/super-admin/tenants/${tenant.id}`, { is_active: !tenant.is_active });
            setTenants(tenants.map(t => t.id === tenant.id ? { ...t, is_active: !t.is_active } : t));
            toast(`Workspace ${tenant.is_active ? "deactivated" : "activated"}`);
        } catch {
            toast("Update failed", "error");
        }
    };

    const filtered = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        String(t.id).includes(search)
    );

    return (
        <Dashboard>
            <ToastBar toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between p-6 mb-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Globe size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Governance</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Tenant Management</h1>
                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wide opacity-60">System-wide workspace administration</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-lg shadow-white/10"
                >
                    <Plus size={16} /> New Workspace
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                {[
                    { label: "Total Workspaces", value: tenants.length, icon: <Building size={20} />, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
                    { label: "Active Nodes", value: tenants.filter(t => t.is_active).length, icon: <Activity size={20} />, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                    { label: "Inactive", value: tenants.filter(t => !t.is_active).length, icon: <X size={20} />, color: "bg-rose-50 text-rose-600 border-rose-100" },
                ].map(s => (
                    <div key={s.label} className={`p-6 rounded-3xl border-2 flex items-center gap-5 ${s.color}`}>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-current/10 flex items-center justify-center shadow-sm">{s.icon}</div>
                        <div>
                            <div className="text-2xl font-black leading-none mb-1">{s.value}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table Container */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search workspaces by name or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-white outline-none text-sm font-bold focus:border-slate-900 focus:shadow-lg focus:shadow-slate-100 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {["ID", "WORKSPACE", "STATUS", "CREATED", "ACTIONS"].map(h => (
                                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-10 text-center"><RefreshCw className="animate-spin mx-auto text-slate-200" size={24} /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center">
                                    <Building size={48} className="mx-auto text-slate-100 mb-4" />
                                    <div className="text-sm font-black text-slate-300 uppercase tracking-widest">No matching workspaces</div>
                                </td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5 font-mono text-[11px] font-black text-slate-400">#{t.id}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm
                                                ${t.is_active ? 'bg-slate-900' : 'bg-slate-200'}`}>
                                                {t.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">{t.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t.description || "System Workspace"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${t.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                {t.is_active ? 'Active' : 'Offline'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-[11px] font-bold text-slate-500">{fmtDate(t.created_at)}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleStatus(t)}
                                                className={`p-2 rounded-xl border-2 transition-all active:scale-95
                                                    ${t.is_active ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 border-emerald-100 hover:bg-emerald-500 hover:text-white'}`}
                                                title={t.is_active ? "Deactivate" : "Activate"}
                                            >
                                                {t.is_active ? <Trash2 size={16} /> : <CheckCheck size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCreate(false)} />
                <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleCreateTenant}>
                        <div className="p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Building className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Workspace</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Provision system tenant</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Workspace Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={createForm.name}
                                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="Internal Operations, Client A, etc."
                                        className="w-full h-12 px-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none text-sm font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                        placeholder="Add context about this node..."
                                        rows={3}
                                        className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none text-sm font-bold transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white transition-all">Cancel</button>
                            <button type="submit" disabled={createLoading} className="flex-[1.5] px-6 py-4 rounded-2xl bg-indigo-600 text-[10px] font-black text-white uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                                {createLoading ? <RefreshCw className="animate-spin" size={16} /> : <><Plus size={16} /> Provision</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>}
        </Dashboard>
    );
}
