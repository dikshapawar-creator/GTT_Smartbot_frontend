import { useState } from "react";
import { X, Plus } from "lucide-react";
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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 animate-scale-in">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Create New Role</h3>
                        <p className="text-sm text-gray-500 mt-1">Define a role and its hierarchy level</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name <span className="text-red-500">*</span></label>
                        <input
                            value={name}
                            onChange={(e) => { setName(e.target.value); setErr(""); }}
                            placeholder="e.g. support_staff"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${err ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                        />
                        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hierarchy Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value={1}>Level 1 (Sales/Staff)</option>
                            <option value={2}>Level 2 (Admin/Manager)</option>
                            <option value={3}>Level 3 (SuperAdmin)</option>
                        </select>
                        <p className="text-[10px] text-gray-500 mt-2 px-1">Higher levels can manage users of lower levels.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            rows={3}
                            placeholder="What can users with this role do?"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                        />
                    </div>
                </form>

                <div className="px-6 py-5 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition">Cancel</button>
                    <button
                        type="submit"
                        onClick={submit}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create Role
                    </button>
                </div>
            </div>
        </div>
    );
}
