"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Users, Shield, Plus, Download, Search, ChevronDown,
    MoreHorizontal, Trash2, KeyRound, UserX, UserCheck,
    Edit3, X, Check, UserPlus, Mail, Lock, Eye, EyeOff,
    CheckCheck, AlertTriangle, RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard/Dashboard";

// ── Types ────────────────────────────────────────────────────────────────────
type UserRole = { id: number; name: string; level: number; description?: string };
type User = {
    id: number; email: string;
    role: UserRole | string | null;
    role_name?: string;
    is_active: boolean; created_at?: string; is_verified?: boolean;
};
type Toast = { id: number; message: string; type: "success" | "error" | "info" };
type Confirm =
    | { type: "deactivate"; user: User }
    | { type: "delete"; user: User }
    | { type: "deleteRole"; roleId: number };

// ── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    administrator: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
    manager: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    sales: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    employee: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
};
const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    2: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    3: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
    4: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
};
const AVATAR_BG = ["#7c3aed", "#059669", "#0284c7", "#d97706", "#e11d48", "#4f46e5"];
const avatarBg = (e: string) => AVATAR_BG[e.charCodeAt(0) % AVATAR_BG.length];
const initials = (e: string) => e.slice(0, 2).toUpperCase();
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const getRoleName = (u: User): string => {
    if (u.role_name) return u.role_name.toLowerCase();
    if (typeof u.role === "string" && u.role) return u.role.toLowerCase();
    if (u.role && typeof u.role === "object") return (u.role as UserRole).name.toLowerCase();
    return "employee";
};
const getRoleColors = (u: User) => ROLE_COLORS[getRoleName(u)] ?? ROLE_COLORS.employee;

function exportCSV(users: User[]) {
    const rows = ["ID,Email,Role,Status,Joined",
        ...users.map(u => `${u.id},${u.email},${getRoleName(u)},${u.is_active ? "Active" : "Inactive"},${fmtDate(u.created_at)}`)
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([rows], { type: "text/csv" })), download: "users.csv",
    });
    a.click();
}

// ── Toast ────────────────────────────────────────────────────────────────────
function ToastBar({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
    return (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 300, display: "flex", flexDirection: "column", gap: 8 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                    borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    border: `1px solid ${t.type === "success" ? "#bbf7d0" : t.type === "error" ? "#fecaca" : "#bfdbfe"}`,
                    background: t.type === "success" ? "#f0fdf4" : t.type === "error" ? "#fef2f2" : "#eff6ff",
                    color: t.type === "success" ? "#15803d" : t.type === "error" ? "#b91c1c" : "#1d4ed8",
                    fontSize: 13, fontWeight: 600, minWidth: 280, animation: "slideIn .2s ease",
                }}>
                    {t.type === "success" ? <Check size={14} /> : t.type === "error" ? <AlertTriangle size={14} /> : <RefreshCw size={14} />}
                    <span style={{ flex: 1 }}>{t.message}</span>
                    <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", opacity: .5, lineHeight: 0 }}><X size={13} /></button>
                </div>
            ))}
        </div>
    );
}

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, variant = "danger", loading, onConfirm, onCancel }: {
    title: string; message: string; confirmLabel: string; variant?: "danger" | "warning";
    loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }} onClick={onCancel} />
            <div style={{ position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.15)", width: "100%", maxWidth: 400, padding: 28, border: "1px solid #f1f5f9" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, background: variant === "danger" ? "#fef2f2" : "#fffbeb" }}>
                    <AlertTriangle size={20} color={variant === "danger" ? "#dc2626" : "#d97706"} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: variant === "danger" ? "#dc2626" : "#d97706", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: loading ? .6 : 1 }}>
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ user, isSuperAdmin, onClose, onReset, onDeactivate, onDelete, onEditRole }: {
    user: User; isSuperAdmin: boolean; onClose: () => void;
    onReset: () => void; onDeactivate: () => void; onDelete: () => void; onEditRole: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, [onClose]);

    const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
        <button key={label} onClick={onClick} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
            border: "none", background: "none", textAlign: "left", fontSize: 13, fontWeight: 500, cursor: "pointer",
            color: danger ? "#dc2626" : "#374151",
        }}
            onMouseEnter={e => (e.currentTarget.style.background = danger ? "#fef2f2" : "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            {icon}{label}
        </button>
    );

    return (
        <div ref={ref} style={{ position: "absolute", right: 8, top: "100%", zIndex: 100, width: 192, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(0,0,0,.12)", padding: "4px 0", overflow: "hidden" }}>
            {isSuperAdmin && item(<Edit3 size={14} />, "Change Role", onEditRole)}
            {item(<KeyRound size={14} />, "Reset Password", onReset)}
            {item(user.is_active ? <UserX size={14} /> : <UserCheck size={14} />, user.is_active ? "Deactivate" : "Reactivate", onDeactivate)}
            <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
            {item(<Trash2 size={14} />, "Delete User", onDelete, true)}
        </div>
    );
}

// ── Users Table ───────────────────────────────────────────────────────────────
function UsersTable({ users, roles, isLoading, isSuperAdmin, onDeactivate, onDelete, onResetPassword, onChangeRole }: {
    users: User[]; roles: UserRole[]; isLoading: boolean; isSuperAdmin: boolean;
    onDeactivate: (u: User) => void; onDelete: (u: User) => void;
    onResetPassword: (u: User) => void; onChangeRole: (u: User, role: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState<number[]>([]);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [editingRole, setEditingRole] = useState<number | null>(null);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (u.email.toLowerCase().includes(q) || String(u.id).includes(q)) &&
            (roleFilter === "all" || getRoleName(u) === roleFilter) &&
            (statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active));
    });
    const allChecked = filtered.length > 0 && filtered.every(u => selected.includes(u.id));
    const toggleAll = () => setSelected(allChecked ? [] : filtered.map(u => u.id));
    const toggleOne = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const active = users.filter(u => u.is_active).length;

    const S = { // shared inline styles shorthand
        th: { padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const },
        td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" as const },
    };

    return (
        <div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid #f1f5f9" }}>
                {[
                    { label: "Total Users", value: users.length, icon: <Users size={20} color="#6366f1" />, iconBg: "#eef2ff" },
                    { label: "Active", value: active, icon: <UserCheck size={20} color="#059669" />, iconBg: "#ecfdf5" },
                    { label: "Inactive", value: users.length - active, icon: <UserX size={20} color="#dc2626" />, iconBg: "#fef2f2" },
                ].map((s, i) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderRight: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                    <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find by name, email or ID…"
                        style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }}
                        onFocus={e => (e.target.style.borderColor = "#6366f1")} onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                {[
                    { val: roleFilter, set: setRoleFilter, opts: [{ v: "all", l: "All roles" }, ...roles.map(r => ({ v: r.name, l: r.name }))] },
                    { val: statusFilter, set: setStatusFilter, opts: [{ v: "all", l: "All statuses" }, { v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }] },
                ].map((dd, i) => (
                    <div key={i} style={{ position: "relative" }}>
                        <select value={dd.val} onChange={e => dd.set(e.target.value)} style={{ appearance: "none", paddingLeft: 12, paddingRight: 32, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, color: "#374151", outline: "none", cursor: "pointer" }}>
                            {dd.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    </div>
                ))}
                {selected.length > 0 && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{selected.length} selected</span>
                        <button onClick={() => setSelected([])} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, color: "#6366f1" }}><X size={12} /></button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ background: "#f8fafc" }}>
                        <tr>
                            <th style={{ ...S.th, width: 40, paddingLeft: 20 }}>
                                <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                            </th>
                            {["ID", "USER", "ROLE", "STATUS", "JOINED", "ACTIONS"].map(h => (
                                <th key={h} style={S.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i}><td colSpan={7} style={S.td}>
                                <div style={{ height: 14, background: "#f1f5f9", borderRadius: 6, width: `${60 + (i % 4) * 10}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
                            </td></tr>
                        )) : filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "60px 16px" }}>
                                <Users size={40} color="#e2e8f0" style={{ margin: "0 auto 12px", display: "block" }} />
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>No users found</p>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>Try adjusting your filters</p>
                            </td></tr>
                        ) : filtered.map(u => (
                            <tr key={u.id} style={{ background: selected.includes(u.id) ? "#f5f3ff" : "#fff" }}
                                onMouseEnter={e => { if (!selected.includes(u.id)) (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = selected.includes(u.id) ? "#f5f3ff" : "#fff" }}>
                                <td style={{ ...S.td, paddingLeft: 20, width: 40 }}>
                                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleOne(u.id)} style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                                </td>
                                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>#{u.id}</td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarBg(u.email), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{initials(u.email)}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{u.email}</div>
                                            {u.is_verified && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#0284c7", fontWeight: 500, marginTop: 2 }}><Check size={11} /> verified</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={S.td}>
                                    {editingRole === u.id ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <select defaultValue={getRoleName(u)} onChange={e => { onChangeRole(u, e.target.value); setEditingRole(null); }}
                                                style={{ fontSize: 12, border: "1.5px solid #6366f1", borderRadius: 8, padding: "4px 8px", outline: "none" }} autoFocus>
                                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                            </select>
                                            <button onClick={() => setEditingRole(null)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, color: "#94a3b8" }}><X size={13} /></button>
                                        </div>
                                    ) : (
                                        <span onClick={() => isSuperAdmin && setEditingRole(u.id)} title={isSuperAdmin ? "Click to change role" : ""} style={{
                                            display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            textTransform: "capitalize" as const, border: `1.5px solid ${getRoleColors(u).border}`,
                                            background: getRoleColors(u).bg, color: getRoleColors(u).text,
                                            cursor: isSuperAdmin ? "pointer" : "default",
                                        }}>{getRoleName(u)}</span>
                                    )}
                                </td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? "#10b981" : "#cbd5e1", display: "inline-block" }} />
                                        <span style={{ color: u.is_active ? "#059669" : "#94a3b8" }}>{u.is_active ? "Active" : "Inactive"}</span>
                                    </div>
                                </td>
                                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{fmtDate(u.created_at)}</td>
                                <td style={{ ...S.td, position: "relative" }}>
                                    <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                        <MoreHorizontal size={16} />
                                    </button>
                                    {openMenu === u.id && <ActionMenu user={u} isSuperAdmin={isSuperAdmin} onClose={() => setOpenMenu(null)}
                                        onReset={() => { onResetPassword(u); setOpenMenu(null); }}
                                        onDeactivate={() => { onDeactivate(u); setOpenMenu(null); }}
                                        onDelete={() => { onDelete(u); setOpenMenu(null); }}
                                        onEditRole={() => { setEditingRole(u.id); setOpenMenu(null); }} />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!isLoading && filtered.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                    <span>Showing {filtered.length} of {users.length} users</span>
                    <span>Page 1 of 1</span>
                </div>
            )}
        </div>
    );
}

// ── Roles Table ───────────────────────────────────────────────────────────────
function RolesTable({ roles, isLoading, onDelete, onEdit }: {
    roles: UserRole[]; isLoading: boolean;
    onDelete: (id: number) => void; onEdit: (role: UserRole, u: Partial<UserRole>) => void;
}) {
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const startEdit = (r: UserRole) => { setEditId(r.id); setEditName(r.name); setEditDesc(r.description ?? ""); };
    const commitEdit = (r: UserRole) => { onEdit(r, { name: editName, description: editDesc }); setEditId(null); };

    const S = {
        th: { padding: "12px 20px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" as const },
        td: { padding: "16px 20px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" as const },
    };
    const getLvlStyle = (lvl: number) => LEVEL_COLORS[lvl] ?? LEVEL_COLORS[1];

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ background: "#f8fafc" }}>
                    <tr>{["NAME", "LEVEL", "DESCRIPTION", "ROLE TYPE", "SETTINGS"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}><td colSpan={5} style={S.td}><div style={{ height: 14, background: "#f1f5f9", borderRadius: 6, width: "60%" }} /></td></tr>
                    )) : roles.map(role => {
                        const lc = getLvlStyle(role.level);
                        return (
                            <tr key={role.id} className="group"
                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc"}
                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fff"}>
                                <td style={S.td}>
                                    {editId === role.id ? (
                                        <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                                            style={{ border: "2px solid #6366f1", borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 600, outline: "none", width: 140 }} />
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: lc.bg, border: `1.5px solid ${lc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: lc.text }}>
                                                {role.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{role.name}</span>
                                        </div>
                                    )}
                                </td>
                                <td style={S.td}>
                                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: lc.bg, border: `1.5px solid ${lc.border}`, color: lc.text }}>Level {role.level}</span>
                                </td>
                                <td style={{ ...S.td, color: "#64748b" }}>
                                    {editId === role.id ? (
                                        <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Add description…"
                                            style={{ border: "2px solid #6366f1", borderRadius: 8, padding: "5px 10px", fontSize: 13, outline: "none", width: 220 }} />
                                    ) : (role.description ?? <span style={{ color: "#cbd5e1" }}>—</span>)}
                                </td>
                                <td style={S.td}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                                        <Shield size={13} /> System Role
                                    </span>
                                </td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        {editId === role.id ? (
                                            <>
                                                <button onClick={() => commitEdit(role)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#ecfdf5", color: "#059669", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} /></button>
                                                <button onClick={() => setEditId(null)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(role)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#eef2ff"; (e.currentTarget as HTMLButtonElement).style.color = "#6366f1"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}><Edit3 size={13} /></button>
                                                <button onClick={() => onDelete(role.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}><Trash2 size={13} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Create User Modal ─────────────────────────────────────────────────────────
const PW_RULES = [
    { re: /.{8,}/, label: "8+ chars" }, { re: /[A-Z]/, label: "Upper" }, { re: /[a-z]/, label: "Lower" },
    { re: /[0-9]/, label: "Number" }, { re: /[^A-Za-z0-9]/, label: "Special" },
];
const EMPTY = { email: "", password: "", role_name: "sales", is_active: true, send_invite: false };

function CreateUserModal({ roles, onClose, onCreated, showToast }: {
    roles: UserRole[]; onClose: () => void;
    onCreated: (u: User) => void; showToast: (m: string, t: "success" | "error" | "info") => void;
}) {
    const [form, setForm] = useState({ ...EMPTY });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        if (!form.send_invite) {
            if (!form.password) e.password = "Password required";
            else if (PW_RULES.some(r => !r.re.test(form.password))) e.password = "Does not meet requirements";
        }
        setErrors(e); return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!validate()) return;
        setLoading(true);
        try {
            const { data } = await api.post<User>("/users/create", {
                email: form.email.trim(), password: form.send_invite ? undefined : form.password,
                role_name: form.role_name, is_active: form.is_active,
            });
            setSuccess(true);
            setTimeout(() => { onCreated(data); onClose(); }, 700);
        } catch (err) { showToast((err as Error).message || "Failed to create user", "error"); }
        finally { setLoading(false); }
    };

    const selectedRole = roles.find(r => r.name === form.role_name);
    const rc = ROLE_COLORS[form.role_name] ?? ROLE_COLORS.employee;

    const inputStyle = (hasErr?: boolean) => ({
        width: "100%", height: 44, padding: "0 14px", borderRadius: 10,
        border: `2px solid ${hasErr ? "#fca5a5" : "#e2e8f0"}`,
        background: hasErr ? "#fef2f2" : "#f8fafc", fontSize: 14, color: "#0f172a",
        outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
        transition: "border-color .15s",
    });

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)" }} onClick={onClose} />
            <div style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 25px 80px rgba(0,0,0,.2)", width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <UserPlus size={20} color="#fff" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Add New User</h2>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>Fill in the details to create a new team member</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <form id="cu" onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                <Mail size={12} /> Email Address <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@company.com"
                                style={inputStyle(!!errors.email)}
                                onFocus={e => (e.target.style.borderColor = errors.email ? "#ef4444" : "#6366f1")} onBlur={e => (e.target.style.borderColor = errors.email ? "#fca5a5" : "#e2e8f0")} />
                            {errors.email && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{errors.email}</p>}
                        </div>
                        {/* Role */}
                        <div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                <Shield size={12} /> User Role <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ position: "relative" }}>
                                <select value={form.role_name} onChange={e => set("role_name", e.target.value)}
                                    style={{ ...inputStyle(), paddingRight: 40, appearance: "none", cursor: "pointer" }}>
                                    {roles.map(r => <option key={r.id} value={r.name} style={{ textTransform: "capitalize" }}>{r.name}</option>)}
                                </select>
                                <ChevronDown size={14} color="#94a3b8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                            </div>
                            {/* Level clearance pill */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "#eff6ff", border: "1.5px solid #bfdbfe" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <CheckCheck size={14} color="#3b82f6" />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.12em" }}>Level {selectedRole?.level ?? "?"} Clearance</span>
                                </div>
                                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: rc.bg, border: `1.5px solid ${rc.border}`, color: rc.text }}>{form.role_name}</span>
                            </div>
                        </div>
                        {/* Password */}
                        <div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                <Lock size={12} /> Password {!form.send_invite && <span style={{ color: "#ef4444" }}>*</span>}
                            </label>
                            <div style={{ position: "relative" }}>
                                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                                    disabled={form.send_invite} placeholder={form.send_invite ? "Will be set via email invite" : "8+ characters"}
                                    style={{ ...inputStyle(!!errors.password), paddingRight: 44, opacity: form.send_invite ? .5 : 1 }}
                                    onFocus={e => (e.target.style.borderColor = errors.password ? "#ef4444" : "#6366f1")} onBlur={e => (e.target.style.borderColor = errors.password ? "#fca5a5" : "#e2e8f0")} />
                                <button type="button" onClick={() => setShowPw(s => !s)} disabled={form.send_invite}
                                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", lineHeight: 0, opacity: form.send_invite ? .3 : 1 }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.password && !form.send_invite && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                    {PW_RULES.map((r, i) => {
                                        const met = r.re.test(form.password); return (
                                            <span key={i} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", border: "1px solid", background: met ? "#ecfdf5" : "#f8fafc", color: met ? "#059669" : "#94a3b8", borderColor: met ? "#6ee7b7" : "#e2e8f0" }}>{r.label}</span>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.password && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{errors.password}</p>}
                        </div>
                        {/* Send invite */}
                        <button type="button" onClick={() => { set("send_invite", !form.send_invite); if (!form.send_invite) set("password", ""); }}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 12, border: `2px solid ${form.send_invite ? "#6366f1" : "#e2e8f0"}`, background: form.send_invite ? "#eef2ff" : "#f8fafc", cursor: "pointer", textAlign: "left" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: form.send_invite ? "#6366f1" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {form.send_invite && <Check size={12} color="#fff" />}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Send Email Invite</div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>User sets their own password via email link</div>
                            </div>
                        </button>
                        {/* Active toggle */}
                        <button type="button" onClick={() => set("is_active", !form.is_active)}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `2px solid ${form.is_active ? "#0f172a" : "#e2e8f0"}`, background: "#fff", cursor: "pointer", textAlign: "left" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: form.is_active ? "#0f172a" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {form.is_active && <CheckCheck size={12} color="#fff" />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Active User</span>
                        </button>
                    </form>
                </div>
                {/* Footer */}
                <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 12, flexShrink: 0 }}>
                    <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Cancel</button>
                    <button form="cu" type="submit" disabled={loading || success}
                        style={{ flex: 1.5, padding: "12px", borderRadius: 12, border: "none", background: success ? "#059669" : "#0f172a", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (loading || success) ? .8 : 1 }}>
                        {success ? <><Check size={15} /> Created!</> : loading ? <RefreshCw size={15} className="animate-spin" /> : <><UserPlus size={15} /> Create User</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
    const [tab, setTab] = useState<"users" | "roles">("users");
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [actLoading, setActLoading] = useState(false);
    const isSuperAdmin = auth.isManager?.() ?? false;

    const toast = useCallback((message: string, type: Toast["type"] = "success") => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [u, r] = await Promise.all([api.get<User[]>("/users/"), api.get<UserRole[]>("/roles/")]);
            setUsers(u.data); setRoles(r.data);
        } catch { toast("Failed to load data", "error"); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeactivate = async (user: User) => {
        if (user.id === auth.getUser()?.id) return toast("Cannot deactivate your own account", "error");
        setActLoading(true);
        try {
            await api.delete(`/users/${user.id}`);
            setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: !x.is_active } : x));
            toast(`User ${user.is_active ? "deactivated" : "reactivated"}`);
        } catch { toast("Action failed", "error"); }
        finally { setActLoading(false); setConfirm(null); }
    };

    const handleDelete = async (user: User) => {
        setActLoading(true);
        try {
            await api.delete(`/users/${user.id}?permanent=true`);
            setUsers(u => u.filter(x => x.id !== user.id));
            toast(`${user.email} deleted`, "error");
        } catch { toast("Failed to delete", "error"); }
        finally { setActLoading(false); setConfirm(null); }
    };

    const handleReset = async (user: User) => {
        try { await api.post("/auth/forgot-password", { email: user.email }); toast(`Reset email sent to ${user.email}`, "info"); }
        catch { toast("Failed to send reset email", "error"); }
    };

    const handleRoleChange = async (user: User, roleName: string) => {
        try {
            await api.patch(`/users/${user.id}`, { role_name: roleName });
            setUsers(u => u.map(x => x.id === user.id ? { ...x, role: roleName, role_name: roleName } : x));
            toast(`Role updated to "${roleName}"`);
        } catch { toast("Failed to update role", "error"); }
    };

    const handleDeleteRole = async (id: number) => {
        setActLoading(true);
        try { await api.delete(`/roles/${id}`); setRoles(r => r.filter(x => x.id !== id)); toast("Role deleted"); }
        catch { toast("Failed — ensure no users are assigned to this role", "error"); }
        finally { setActLoading(false); setConfirm(null); }
    };

    const handleEditRole = async (role: UserRole, updates: Partial<UserRole>) => {
        try { await api.patch(`/roles/${role.id}`, updates); setRoles(r => r.map(x => x.id === role.id ? { ...x, ...updates } : x)); toast(`Role updated`); }
        catch { toast("Failed to update role", "error"); }
    };

    const btnOutlined = {
        display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 10,
        border: "1.5px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)",
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.9)", cursor: "pointer",
    } as React.CSSProperties;
    const btnPrimary = {
        display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 10,
        border: "none", background: "#6366f1", fontSize: 13, fontWeight: 700, color: "#fff",
        cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,.4)",
    } as React.CSSProperties;

    return (
        <Dashboard>
            <ToastBar toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Hero Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "24px 28px", marginBottom: 24,
                background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",
                borderRadius: 16, border: "1px solid rgba(255,255,255,.06)",
                boxShadow: "0 8px 32px rgba(0,0,0,.2)",
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Shield size={14} color="#818cf8" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.15em" }}>Admin Control</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>User Management</h1>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>Manage team members, roles and access permissions</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button style={btnOutlined} onClick={() => exportCSV(users)}><Download size={15} /> Export CSV</button>
                    {tab === "roles" && <button style={btnOutlined}><Plus size={15} /> New Role</button>}
                    <button style={btnPrimary} onClick={() => setShowCreate(true)}><Plus size={15} /> Invite User</button>
                </div>
            </div>

            {/* Main Card */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,.06)", overflow: "hidden" }}>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 20px", background: "#fff" }}>
                    {(["users", "roles"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "16px 16px",
                            background: "none", border: "none", borderBottom: `2.5px solid ${tab === t ? "#6366f1" : "transparent"}`,
                            fontSize: 13, fontWeight: tab === t ? 700 : 500,
                            color: tab === t ? "#6366f1" : "#94a3b8", cursor: "pointer", marginBottom: -1,
                            transition: "all .15s",
                        }}>
                            {t === "users" ? <Users size={15} /> : <Shield size={15} />}
                            {t === "users" ? "Users List" : "Security Roles"}
                            <span style={{ padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tab === t ? "#eef2ff" : "#f1f5f9", color: tab === t ? "#6366f1" : "#94a3b8" }}>
                                {t === "users" ? users.length : roles.length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                {tab === "users"
                    ? <UsersTable users={users} roles={roles} isLoading={loading} isSuperAdmin={isSuperAdmin}
                        onDeactivate={u => setConfirm({ type: "deactivate", user: u })}
                        onDelete={u => setConfirm({ type: "delete", user: u })}
                        onResetPassword={handleReset} onChangeRole={handleRoleChange} />
                    : <RolesTable roles={roles} isLoading={loading}
                        onDelete={id => setConfirm({ type: "deleteRole", roleId: id })}
                        onEdit={handleEditRole} />
                }
            </div>

            {/* Modals */}
            {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)}
                onCreated={u => { setUsers(p => [u, ...p]); toast(`"${u.email}" created`); }} showToast={toast} />}

            {confirm?.type === "deactivate" && <ConfirmModal
                title={confirm.user.is_active ? "Deactivate User?" : "Reactivate User?"}
                message={`${confirm.user.email} will ${confirm.user.is_active ? "lose" : "regain"} access immediately.`}
                confirmLabel={confirm.user.is_active ? "Deactivate" : "Reactivate"} variant="warning"
                loading={actLoading} onConfirm={() => handleDeactivate(confirm.user)} onCancel={() => setConfirm(null)} />}

            {confirm?.type === "delete" && <ConfirmModal
                title="Permanently Delete User?"
                message={`This will permanently remove ${confirm.user.email}. This cannot be undone.`}
                confirmLabel="Delete Forever" variant="danger"
                loading={actLoading} onConfirm={() => handleDelete(confirm.user)} onCancel={() => setConfirm(null)} />}

            {confirm?.type === "deleteRole" && <ConfirmModal
                title="Delete Security Role?"
                message="This is permanent. Ensure no users are assigned to this role first."
                confirmLabel="Delete Role" variant="danger"
                loading={actLoading} onConfirm={() => handleDeleteRole(confirm.roleId)} onCancel={() => setConfirm(null)} />}

            <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </Dashboard>
    );
}
