import React, { useState } from "react";
import {
    Users, Search, ChevronDown, MoreHorizontal,
    UserX, Check,
    ChevronUp, KeyRound, Edit3, UserCheck
} from "lucide-react";
import {
    User, UserRole, SortKey, SortDir, getRoleName, getInitials,
    avatarBg, formatDate, ROLE_COLORS
} from "./types";

const ROWS_PER_PAGE = 10;

interface UsersTableProps {
    users: User[];
    roles: UserRole[];
    isLoading: boolean;
    onDeactivate: (user: User) => void;
    onChangeRole: () => void;
    onResetPassword?: (user: User) => void;
    canManage: boolean;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey, sortKey: SortKey, sortDir: SortDir }) => (
    <span className="inline-flex flex-col ml-1 opacity-30 group-hover:opacity-100 transition-opacity">
        <ChevronUp className={`h-2 w-2 -mb-0.5 ${sortKey === col && sortDir === "asc" ? "text-indigo-600 opacity-100" : ""}`} />
        <ChevronDown className={`h-2 w-2 ${sortKey === col && sortDir === "desc" ? "text-indigo-600 opacity-100" : ""}`} />
    </span>
);

export function UsersTable({ users, roles, isLoading, onDeactivate, onChangeRole, onResetPassword, canManage }: UsersTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page] = useState(1);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = users.length - activeCount;

    const filtered = users
        .filter((u) => {
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || u.email?.toLowerCase().includes(q) || String(u.id).includes(q);
            const matchRole = !roleFilter || getRoleName(u).toLowerCase() === roleFilter.toLowerCase();
            const matchStatus =
                !statusFilter ||
                (statusFilter === "active" && u.is_active) ||
                (statusFilter === "inactive" && !u.is_active);
            return matchSearch && matchRole && matchStatus;
        })
        .sort((a, b) => {
            let va: string | boolean | number, vb: string | boolean | number;
            switch (sortKey) {
                case "id": va = a.id; vb = b.id; break;
                case "email": va = a.email; vb = b.email; break;
                case "role": va = getRoleName(a); vb = getRoleName(b); break;
                case "is_active": va = a.is_active; vb = b.is_active; break;
                case "created_at": va = a.created_at; vb = b.created_at; break;
                default: return 0;
            }
            if (va < vb) return sortDir === "asc" ? -1 : 1;
            if (va > vb) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const allSelected = paginated.length > 0 && paginated.every((u) => selected.has(u.id));
    const toggleAll = () => {
        if (allSelected) { setSelected((s) => { const n = new Set(s); paginated.forEach((u) => n.delete(u.id)); return n; }); }
        else { setSelected((s) => { const n = new Set(s); paginated.forEach((u) => n.add(u.id)); return n; }); }
    };
    const toggleOne = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    return (
        <div className="flex flex-col bg-white">

            {/* ── Stats Row (divide-x) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 overflow-hidden">
                {[
                    { label: "Total Users", value: users.length, icon: Users, color: "text-slate-700", bg: "bg-slate-50" },
                    { label: "Active", value: activeCount, icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Inactive", value: inactiveCount, icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="flex items-center gap-4 px-6 py-5">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div>
                            <div className={`text-2xl font-black ${color} leading-none tracking-tight`}>{value}</div>
                            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1">{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                <div className="relative flex-1 max-w-xs group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Find by name, email or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="appearance-none h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                        <option value="">All roles</option>
                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto min-h-0">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-white">
                            <th className="px-6 py-4 text-left w-10">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                            </th>
                            {["ID", "USER", "ROLE", "TENANTS", "STATUS", "JOINED", "ACTIONS"].map(h => (
                                <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 tracking-widest uppercase cursor-pointer group" onClick={() => (h !== "ACTIONS" && h !== "TENANTS") && handleSort(h.toLowerCase() as SortKey)}>
                                    <div className="flex items-center">
                                        {h} {(h !== "ACTIONS" && h !== "TENANTS") && <SortIcon col={h.toLowerCase() as SortKey} sortKey={sortKey} sortDir={sortDir} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    <td colSpan={7} className="px-6 py-4 animate-pulse"><div className="h-10 bg-slate-50 rounded-lg" /></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-slate-400 font-inter">No users detected</p>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((user) => {
                                const roleName = getRoleName(user);
                                return (
                                    <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors group ${selected.has(user.id) ? "bg-indigo-50/30" : ""}`}>
                                        <td className="px-6 py-4">
                                            <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleOne(user.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                        </td>
                                        <td className="px-4 py-4 text-xs font-mono text-slate-400">#{user.id}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl ${avatarBg(user.email)} flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm shadow-black/5`}>
                                                    {getInitials(user.email)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-semibold text-slate-800 leading-tight">{user.email}</span>
                                                    <span className="text-[10px] font-medium text-sky-600 flex items-center gap-0.5 mt-0.5">
                                                        <Check className="h-3 w-3" /> verified
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border capitalize tracking-wide transition-all
                                                ${ROLE_COLORS[roleName] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                                {roleName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {user.is_super_admin ? (
                                                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase">System Wide</span>
                                                ) : user.tenants && user.tenants.length > 0 ? (
                                                    user.tenants.map(t => (
                                                        <span key={t.tenant_id} className={`px-2 py-0.5 rounded text-[10px] font-medium border ${t.is_primary ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-slate-500 border-slate-100'}`}>
                                                            {t.tenant_name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-300 italic text-[10px]">No tenants</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-2 text-[11px] font-semibold">
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                                                <span className={user.is_active ? "text-emerald-700" : "text-slate-400"}>
                                                    {user.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{formatDate(user.created_at)}</td>
                                        <td className="px-4 py-4 relative">
                                            <div className="flex justify-end">
                                                <button onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {openMenuId === user.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                    <div className="absolute right-4 top-2 z-50 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-in zoom-in-95 duration-200">
                                                        <button onClick={() => { setOpenMenuId(null); onChangeRole(); }}
                                                            className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                                            <Edit3 className="h-4 w-4 stroke-[1.5px]" /> Edit Profile
                                                        </button>
                                                        {onResetPassword && (
                                                            <button onClick={() => { setOpenMenuId(null); onResetPassword(user); }}
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                                                <KeyRound className="h-4 w-4 stroke-[1.5px]" /> Reset Password
                                                            </button>
                                                        )}
                                                        {canManage && (
                                                            <>
                                                                <div className="h-px bg-slate-100 my-1.5 mx-4" />
                                                                <button onClick={() => { setOpenMenuId(null); onDeactivate(user); }}
                                                                    className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-3 transition-colors
                                                                        ${user.is_active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                                                                    {user.is_active ? <UserX className="h-4 w-4 stroke-[2px]" /> : <UserCheck className="h-4 w-4 stroke-[2px]" />}
                                                                    {user.is_active ? "Deactivate User" : "Reactivate User"}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Footer ── */}
            {!isLoading && filtered.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between font-inter">
                    <p className="text-xs font-semibold text-slate-400">
                        Showing {paginated.length} of {filtered.length} users
                    </p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                </div>
            )}
        </div>
    );
}
