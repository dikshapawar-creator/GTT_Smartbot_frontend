import React, { useState } from "react";
import { Search, ChevronUp, ChevronDown, MoreVertical, Pencil, KeyRound, Power, UserX, Users } from "lucide-react";
import { User, UserRole, SortKey, SortDir, getRoleName, getInitials, avatarBg, formatDate, ROLE_BADGE, STATUS_BADGE } from "./types";

const ROWS_PER_PAGE = 10;

interface UsersTableProps {
    users: User[];
    roles: UserRole[];
    isLoading: boolean;
    onChangeRole: (user: User) => void;
    onDeactivate: (user: User) => void;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey, sortKey: SortKey, sortDir: SortDir }) => (
    <span className="inline-flex flex-col ml-1 opacity-40">
        <ChevronUp className={`h-2.5 w-2.5 -mb-0.5 ${sortKey === col && sortDir === "asc" ? "opacity-100 text-blue-600" : ""}`} />
        <ChevronDown className={`h-2.5 w-2.5 ${sortKey === col && sortDir === "desc" ? "opacity-100 text-blue-600" : ""}`} />
    </span>
);

export function UsersTable({ users, roles, isLoading, onChangeRole, onDeactivate }: UsersTableProps) {
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-150 ease-in-out hover:shadow-md animate-fade-in">
            {/* Toolbar */}
            <div className="p-4 border-b border-[#F3F4F6] flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#475569] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                    >
                        <option value="">All Roles</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.name} className="capitalize">{r.name.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#475569] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 bg-gray-50/50">
                            <th className="px-4 py-3 w-12 text-center">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                            </th>
                            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("id")}>
                                <div className="flex items-center justify-center">
                                    ID <SortIcon col="id" sortKey={sortKey} sortDir={sortDir} />
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("email")}>
                                <div className="flex items-center">
                                    User Email <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} />
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("role")}>
                                <div className="flex items-center">
                                    Role <SortIcon col="role" sortKey={sortKey} sortDir={sortDir} />
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("is_active")}>
                                <div className="flex items-center">
                                    Status <SortIcon col="is_active" sortKey={sortKey} sortDir={sortDir} />
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("created_at")}>
                                <div className="flex items-center">
                                    Joined Date <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                                </div>
                            </th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                                        <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-sm">Loading users...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                                        <Users className="h-8 w-8 text-gray-300" />
                                        <p className="text-sm">No users found.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((user) => {
                                const roleName = getRoleName(user);
                                return (
                                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(user.id)}
                                                onChange={() => toggleOne(user.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ opacity: selected.has(user.id) ? 1 : undefined }}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full ${avatarBg(user.email)} flex items-center justify-center text-white text-xs font-medium shadow-sm`}>
                                                    {getInitials(user.email)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize tracking-wide ${ROLE_BADGE[roleName] || ROLE_BADGE.employee}`}>
                                                {roleName.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${user.is_active ? STATUS_BADGE.active : STATUS_BADGE.inactive}`}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {openMenuId === user.id && (
                                                    <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-scale-in origin-top-right">
                                                        <button
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            onClick={() => { setOpenMenuId(null); onChangeRole(user); }}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5 text-gray-400" /> Change Role
                                                        </button>
                                                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                            <KeyRound className="h-3.5 w-3.5 text-gray-400" /> Reset Password
                                                        </button>
                                                        <div className="h-px bg-gray-100 my-1" />
                                                        <button
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                            onClick={() => { setOpenMenuId(null); onDeactivate(user); }}
                                                        >
                                                            {user.is_active ? <Power className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                                                            {user.is_active ? "Deactivate" : "Remove"}
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
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-50 transition"
                        >
                            <ChevronUp className="h-5 w-5 -rotate-90" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-50 transition"
                        >
                            <ChevronDown className="h-5 w-5 -rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
