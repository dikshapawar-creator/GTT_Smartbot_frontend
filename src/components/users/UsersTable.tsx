import React, { useState } from "react";
import { Search, ChevronUp, ChevronDown, MoreVertical, Pencil, KeyRound, Power, UserX, Users, CheckCheck } from "lucide-react";
import { User, UserRole, SortKey, SortDir, getRoleName, getInitials, avatarBg, formatDate, ROLE_BADGE } from "./types";

const ROWS_PER_PAGE = 10;

interface UsersTableProps {
    users: User[];
    roles: UserRole[];
    isLoading: boolean;
    onDeactivate: (user: User) => void;
    onChangeRole: () => void;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey, sortKey: SortKey, sortDir: SortDir }) => (
    <span className="inline-flex flex-col ml-1 opacity-40">
        <ChevronUp className={`h-2.5 w-2.5 -mb-0.5 ${sortKey === col && sortDir === "asc" ? "opacity-100 text-blue-600" : ""}`} />
        <ChevronDown className={`h-2.5 w-2.5 ${sortKey === col && sortDir === "desc" ? "opacity-100 text-blue-600" : ""}`} />
    </span>
);

export function UsersTable({ users, roles, isLoading, onDeactivate, onChangeRole }: UsersTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // ── Filter + Sort ──
    const filtered = users
        .filter((u) => {
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || u.email?.toLowerCase().includes(q) || String(u.id).includes(q);
            const matchRole = !roleFilter || getRoleName(u) === roleFilter;
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
        if (allSelected) {
            setSelected((s) => { const n = new Set(s); paginated.forEach((u) => n.delete(u.id)); return n; });
        } else {
            setSelected((s) => { const n = new Set(s); paginated.forEach((u) => n.add(u.id)); return n; });
        }
    };
    const toggleOne = (id: number) =>
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
            }
            return n;
        });

    return (
        <div className="p-6">
            {/* Redesigned Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: "Total Users", value: users.length, icon: Users, bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "Active", value: users.filter(u => u.is_active).length, icon: CheckCheck, bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "Inactive", value: users.filter(u => !u.is_active).length, icon: UserX, bg: "bg-rose-50", text: "text-rose-600" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.text}`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Core Container */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Fixed Toolbar */}
                <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-6 justify-between items-center bg-white">
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find by name, email or ID…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-900"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full h-11 px-4 pr-10 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
                            >
                                <option value="">All roles</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.name} className="capitalize">{r.name.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 lg:flex-none">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-11 px-4 pr-10 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
                            >
                                <option value="">All statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[11px] uppercase font-semibold tracking-wide text-slate-500 bg-slate-50">
                                <th className="px-6 py-4 w-12 text-center">
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("id")}>
                                    <div className="flex items-center justify-center">
                                        ID <SortIcon col="id" sortKey={sortKey} sortDir={sortDir} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("email")}>
                                    <div className="flex items-center">
                                        User <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("role")}>
                                    <div className="flex items-center">
                                        Role <SortIcon col="role" sortKey={sortKey} sortDir={sortDir} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("is_active")}>
                                    <div className="flex items-center">
                                        Status <SortIcon col="is_active" sortKey={sortKey} sortDir={sortDir} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("created_at")}>
                                    <div className="flex items-center">
                                        Joined <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <div className="h-8 w-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                                            <p className="text-sm font-medium">Loading users...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                                <Users className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">No users found matching criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((user) => {
                                    const roleName = getRoleName(user);
                                    return (
                                        <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(user.id)}
                                                    onChange={() => toggleOne(user.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">#{user.id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-xl ${avatarBg(user.email)} flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
                                                        {getInitials(user.email)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                                                        <p className="text-[11px] font-medium text-slate-500">#{user.id} · verified</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-lg text-[11px] font-medium ${ROLE_BADGE[roleName] || ROLE_BADGE.employee}`}>
                                                    {roleName.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    <span className={`text-[11px] font-medium ${user.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {user.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {formatDate(user.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                    {openMenuId === user.id && (
                                                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 origin-top-right">
                                                            <button
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                                                onClick={() => { setOpenMenuId(null); onChangeRole(); }}
                                                            >
                                                                <Pencil className="h-4 w-4" /> Edit
                                                            </button>
                                                            <button className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                                                                <KeyRound className="h-4 w-4" /> Reset Password
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-2" />
                                                            <button
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                                                                onClick={() => { setOpenMenuId(null); onDeactivate(user); }}
                                                            >
                                                                {user.is_active ? <Power className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                                {user.is_active ? "Suspend" : "Delete"}
                                                            </button>
                                                        </div>
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

                {/* Pagination */}
                {!isLoading && filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronUp className="h-4 w-4 -rotate-90" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronDown className="h-4 w-4 -rotate-90" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
