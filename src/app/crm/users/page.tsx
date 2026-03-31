"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Users, Shield, Plus, Download, Search, ChevronDown,
    MoreHorizontal, Trash2, KeyRound, UserX, UserCheck,
    Edit3, X, Check, UserPlus, Mail, Lock, Eye, EyeOff,
    CheckCheck, AlertTriangle, RefreshCw, Building, Brain
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import IntentManager from "@/components/Dashboard/IntentManager";
import { useCRMUpdates, CRMUpdateEvent } from "@/hooks/useCRMUpdates";
import { useTenant } from "@/context/TenantContext";

// ── Types ────────────────────────────────────────────────────────────────────
type UserRole = { id: number; name: string; level: number; description?: string };
type UserTenantRead = {
    tenant_id: number;
    tenant_name: string;
    status: boolean;
    is_primary: boolean;
};
type User = {
    id: number; email: string;
    role: UserRole | string | null;
    role_name?: string;
    is_active: boolean; created_at?: string; is_verified?: boolean;
    is_super_admin?: boolean;
    tenant_access?: UserTenantRead[];
};
type Toast = { id: number; message: string; type: "success" | "error" | "info" };
type Confirm =
    | { type: "deactivate"; user: User }
    | { type: "delete"; user: User }
    | { type: "deleteRole"; roleId: number };

type Tenant = {
    id: number;
    name: string;
    is_active: boolean;
    description?: string;
    created_at?: string;
};

declare global {
    interface Window {
        openIntel?: (t: Tenant) => void;
    }
}

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
    if (u.is_super_admin) return "Super Admin";
    if (u.role_name) return u.role_name.toLowerCase();
    if (typeof u.role === "string" && u.role) return u.role.toLowerCase();
    if (u.role && typeof u.role === "object") return (u.role as UserRole).name.toLowerCase();
    return "employee";
};
const getRoleColors = (u: User) => {
    if (u.is_super_admin) return { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" };
    return ROLE_COLORS[getRoleName(u)] ?? ROLE_COLORS.employee;
};

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

// ── Component: Action Menu Modal ─────────────────────────────────────────────
function ActionMenuModal({ user, isSuperAdmin, onClose, onReset, onDeactivate, onDelete, onEditRole, onManageAccess }: {
    user: User; isSuperAdmin: boolean; onClose: () => void;
    onReset: () => void; onDeactivate: () => void; onDelete: () => void; onEditRole: () => void;
    onManageAccess: () => void;
}) {
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 16, width: 280, boxShadow: "0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)", overflow: "hidden", animation: "modalIn 0.2s ease-out" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>User Actions</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{user.email}</div>
                </div>
                <div style={{ padding: 8 }}>
                    <button onClick={onEditRole} className="group" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "all .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <Edit3 size={15} color="#64748b" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Change Role</span>
                    </button>
                    {isSuperAdmin && (
                        <button onClick={onManageAccess} className="group" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "all .15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#eef2ff")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            <Shield size={15} color="#6366f1" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>Manage Access</span>
                        </button>
                    )}
                    <button onClick={onReset} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <KeyRound size={15} color="#64748b" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Reset Password</span>
                    </button>
                    <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />
                    <button onClick={onDeactivate} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fff1f2")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <UserX size={15} color="#f43f5e" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e11d48" }}>{user.is_active ? "Deactivate User" : "Activate User"}</span>
                    </button>
                    <button onClick={onDelete} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fff1f2")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <Trash2 size={15} color="#f43f5e" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e11d48" }}>Delete User</span>
                    </button>
                </div>
                <button onClick={onClose} style={{ width: "100%", padding: "12px", border: "none", borderTop: "1px solid #f1f5f9", background: "#fafbfc", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            </div>
            <style jsx>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ── Component: Users Table ──────────────────────────────────────────────────
function UsersTable({ users, roles, tenants, isLoading, isSuperAdmin, selectedFilterTenant, onDeactivate, onDelete, onResetPassword, onChangeRole, onManageAccess, onFilterTenant }: {
    users: User[]; roles: UserRole[]; tenants: Tenant[]; isLoading: boolean; isSuperAdmin: boolean; selectedFilterTenant: string;
    onDeactivate: (u: User) => void; onDelete: (u: User) => void;
    onResetPassword: (u: User) => void; onChangeRole: (u: User, roleName: string) => void;
    onManageAccess: (u: User) => void; onFilterTenant: (tid: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [roleFilt, setRoleFilt] = useState("all");
    const [statusFilt, setStatusFilt] = useState("all");
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [editingRole, setEditingRole] = useState<number | null>(null);

    const filtered = users.filter(u => {
        const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || String(u.id).includes(search);
        const matchesRole = roleFilt === "all" || getRoleName(u) === roleFilt;
        const matchesStatus = statusFilt === "all" || (statusFilt === "active" ? u.is_active : !u.is_active);

        let matchesTenant = true;
        if (selectedFilterTenant !== "all") {
            const tId = parseInt(selectedFilterTenant);
            matchesTenant = u.is_super_admin || u.tenant_access?.some((ut: UserTenantRead) => ut.tenant_id === tId) || false;
        }

        return matchesSearch && matchesRole && matchesStatus && matchesTenant;
    });
    const active = users.filter(u => u.is_active).length;

    const S = { // shared inline styles shorthand
        th: { padding: "12px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #f1f5f9" },
        td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" as const },
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Action Modal Replacement for ActionMenu */}
            {openMenu !== null && (
                <ActionMenuModal
                    user={users.find(u => u.id === openMenu)!}
                    isSuperAdmin={isSuperAdmin}
                    onClose={() => setOpenMenu(null)}
                    onReset={() => { onResetPassword(users.find(u => u.id === openMenu)!); setOpenMenu(null); }}
                    onDeactivate={() => { onDeactivate(users.find(u => u.id === openMenu)!); setOpenMenu(null); }}
                    onDelete={() => { onDelete(users.find(u => u.id === openMenu)!); setOpenMenu(null); }}
                    onEditRole={() => { setEditingRole(openMenu); setOpenMenu(null); }}
                    onManageAccess={() => { onManageAccess(users.find(u => u.id === openMenu)!); setOpenMenu(null); }}
                />
            )}
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
                    { val: roleFilt, set: setRoleFilt, opts: [{ v: "all", l: "All roles" }, ...roles.map(r => ({ v: r.name, l: r.name }))] },
                    { val: statusFilt, set: setStatusFilt, opts: [{ v: "all", l: "All statuses" }, { v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }] },
                ].map((dd, i) => (
                    <div key={i} style={{ position: "relative" }}>
                        <select value={dd.val} onChange={e => dd.set(e.target.value)} style={{ appearance: "none", paddingLeft: 12, paddingRight: 32, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, color: "#374151", outline: "none", cursor: "pointer" }}>
                            {dd.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    </div>
                ))}
                {isSuperAdmin && (
                    <div style={{ position: "relative" }}>
                        <select value={selectedFilterTenant} onChange={e => onFilterTenant(e.target.value)}
                            style={{ appearance: "none", paddingLeft: 12, paddingRight: 32, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, color: "#374151", outline: "none", cursor: "pointer" }}>
                            <option value="all">All Workspaces</option>
                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ background: "#f8fafc" }}>
                        <tr>
                            {/* <th style={{ ...S.th, width: 40, paddingLeft: 20 }}>
                                <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                            </th> */}
                            {["ID", "USER", "ROLE", "TENANTS", "STATUS", "JOINED", "ACTIONS"].map(h => (
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
                            <tr key={u.id}
                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#fff" }}>
                                {/* <td style={{ ...S.td, paddingLeft: 20, width: 40 }}>
                                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleOne(u.id)} style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                                </td> */}
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
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {u.is_super_admin ? (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 6, border: "1px solid #c7d2fe" }}>SYSTEM WIDE</span>
                                        ) : u.tenant_access && u.tenant_access.length > 0 ? (
                                            u.tenant_access.map((ut: UserTenantRead) => {
                                                const isFilterMatch = selectedFilterTenant !== "all" && ut.tenant_id === parseInt(selectedFilterTenant);
                                                return (
                                                    <span key={ut.tenant_id} style={{
                                                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", color: "#475569", border: isFilterMatch ? "1.5px solid #6366f1" : "1px solid #e2e8f0"
                                                    }}>
                                                        {ut.tenant_name || "Workspace"}
                                                        {ut.is_primary && <span style={{ marginLeft: 3, opacity: 0.6 }}>★</span>}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span style={{ fontSize: 10, color: "#cbd5e1", fontStyle: "italic" }}>No tenants</span>
                                        )}
                                        {selectedFilterTenant !== "all" && !u.is_super_admin && !u.tenant_access?.find((ut: UserTenantRead) => ut.tenant_id === parseInt(selectedFilterTenant)) && (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6, border: "1px solid #fecaca" }}>NOT ASSIGNED</span>
                                        )}
                                    </div>
                                </td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? "#10b981" : "#cbd5e1", display: "inline-block" }} />
                                        <span style={{ color: u.is_active ? "#059669" : "#94a3b8" }}>{u.is_active ? "Active" : "Inactive"}</span>
                                    </div>
                                </td>
                                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{fmtDate(u.created_at)}</td>
                                <td style={{ ...S.td, position: "relative" }}>
                                    <button onClick={() => setOpenMenu(u.id)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                        <MoreHorizontal size={16} />
                                    </button>
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
                            <tr key={role.id}
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

// ── Create Role Modal ─────────────────────────────────────────────────────────
function CreateRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: UserRole) => void }) {
    const [name, setName] = useState("");
    const [level, setLevel] = useState(1);
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const { data } = await api.post("/roles", { name: name.trim().toLowerCase(), level, description: desc });
            onCreated(data);
            onClose();
        } catch { alert("Failed to create role. It may already exist."); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: 400, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "24px 30px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Create Security Role</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 30 }}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Role Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Moderator" required
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none" }} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Clearance Level</label>
                        <select value={level} onChange={e => setLevel(parseInt(e.target.value))}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", appearance: "none", background: "#f8fafc" }}>
                            <option value={1}>Level 1 — Standard Sales/Employee</option>
                            <option value={2}>Level 2 — Manager/Admin</option>
                            <option value={3}>Level 3 — Tenant Administrator</option>
                            <option value={4}>Level 4 — System-Wide Governance</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: 25 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Description</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What can this role do?" rows={3}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", resize: "none" }} />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff",
                        fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}>
                        {loading ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={18} />}
                        Create Role
                    </button>
                </form>
            </div>
        </div>
    );
}

function TenantsTable({ tenants, isLoading, onToggleStatus }: { tenants: Tenant[], isLoading: boolean, onToggleStatus: (t: Tenant) => void }) {
    const [search, setSearch] = useState("");
    const filtered = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || String(t.id).includes(search));

    const S = {
        th: { padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" as const },
        td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" as const },
    };

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                    <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces…"
                        style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13 }} />
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ background: "#f8fafc" }}>
                        <tr>{["ID", "WORKSPACE", "STATUS", "CREATED", "ACTIONS"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} style={{ padding: 40, textAlign: "center" }}><RefreshCw className="animate-spin mx-auto text-slate-200" size={24} /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 60, textAlign: "center" }}><p style={{ color: "#94a3b8", fontWeight: 600 }}>No workspaces found</p></td></tr>
                        ) : filtered.map(t => (
                            <tr key={t.id}>
                                <td style={{ ...S.td, width: 60, color: "#94a3b8", fontWeight: 600 }}>#{t.id}</td>
                                <td style={S.td}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.description || "System Workspace"}</div>
                                    </div>
                                </td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.is_active ? "#10b981" : "#cbd5e1" }} />
                                        <span style={{ color: t.is_active ? "#059669" : "#94a3b8" }}>{t.is_active ? "Active" : "Offline"}</span>
                                    </div>
                                </td>
                                <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{fmtDate(t.created_at)}</td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => onToggleStatus(t)} style={{
                                            padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                            background: t.is_active ? "#fef2f2" : "#f0fdf4", color: t.is_active ? "#ef4444" : "#10b981"
                                        }}>
                                            {t.is_active ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                            onClick={() => window.openIntel?.(t)}
                                            style={{
                                                padding: "6px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                                background: "#fff", color: "#64748b", display: "flex", alignItems: "center", gap: 4
                                            }}
                                        >
                                            <Brain size={12} />
                                            Intelligence
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ManageIntelligenceModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
    if (!tenant) return null;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 24, width: "90vw", maxWidth: 1200, height: "90vh", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "20px 30px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Configure intelligence: {tenant.name}</h2>
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Manage greetings, keywords, and CTA actions for this workspace.</p>
                    </div>
                    <button onClick={onClose} style={{ padding: 8, borderRadius: 12, background: "#f1f5f9", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
                    <IntentManager tenantId={tenant.id} />
                </div>
            </div>
        </div>
    );
}

function ManageAccessModal({ user, allTenants, onClose, onSave, isLoading }: {
    user: User; allTenants: Tenant[]; onClose: () => void;
    onSave: (ids: number[], primary: number) => void; isLoading: boolean;
}) {
    const [selected, setSelected] = useState<number[]>(user.tenant_access?.map((ut: UserTenantRead) => ut.tenant_id) || []);
    const [primary, setPrimary] = useState<number | null>(user.tenant_access?.find((ut: UserTenantRead) => ut.is_primary)?.tenant_id || (user.tenant_access?.[0]?.tenant_id || null));

    const toggle = (id: number) => {
        const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
        setSelected(next);
        if (!next.includes(primary!)) setPrimary(next[0] || null);
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: 440, maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "24px 30px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Manage Workspace Access</h2>
                        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Control assignments for {user.email}</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={20} /></button>
                </div>

                <div style={{ padding: 30 }}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
                            Assigned Workspaces
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {allTenants.map(t => (
                                <div key={t.id} onClick={() => toggle(t.id)} style={{
                                    padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${selected.includes(t.id) ? "#6366f1" : "#e2e8f0"}`,
                                    background: selected.includes(t.id) ? "#f5f3ff" : "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    cursor: "pointer", transition: "all .15s"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid", borderColor: selected.includes(t.id) ? "#6366f1" : "#cbd5e1", background: selected.includes(t.id) ? "#6366f1" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {selected.includes(t.id) && <Check size={12} color="#fff" strokeWidth={4} />}
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: selected.includes(t.id) ? "#4338ca" : "#334155" }}>{t.name}</span>
                                    </div>
                                    {selected.includes(t.id) && (
                                        <div onClick={e => { e.stopPropagation(); setPrimary(t.id); }} style={{
                                            padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                                            background: primary === t.id ? "#6366f1" : "#e0e7ff", color: primary === t.id ? "#fff" : "#4f46e5"
                                        }}>
                                            {primary === t.id ? "PRIMARY" : "SET PRIMARY"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button disabled={isLoading || selected.length === 0} onClick={() => onSave(selected, primary!)} style={{
                        width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff",
                        fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(99,102,241,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}>
                        {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCheck size={18} />}
                        Save Permissions
                    </button>
                </div>
            </div>
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
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);
    const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
    const [primaryTenantId, setPrimaryTenantId] = useState<number | null>(null);

    useEffect(() => {
        if (!auth.getUser()?.is_super_admin) return;
        api.get("/super-admin/tenants").then(({ data }) => {
            setAllTenants(data);
            if (data.length > 0) {
                setSelectedTenants([data[0].id]);
                setPrimaryTenantId(data[0].id);
            }
        });
    }, []);
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
            const isSuperAdmin = auth.getUser()?.is_super_admin;
            const endpoint = isSuperAdmin ? "/super-admin/create-user" : "/users/create";
            const payload = {
                email: form.email.trim(),
                password: form.send_invite ? undefined : form.password,
                role_name: form.role_name,
                is_active: form.is_active,
                ...(isSuperAdmin && {
                    tenant_ids: selectedTenants,
                    primary_tenant_id: primaryTenantId
                })
            };
            const { data } = await api.post<User>(endpoint, payload);
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

                        {/* Tenants (Super Admin Only) */}
                        {auth.getUser()?.is_super_admin && allTenants.length > 0 && (
                            <div style={{ padding: "16px", borderRadius: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                                    Workspace Access <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 120, overflowY: "auto", paddingRight: 4 }}>
                                    {allTenants.map(t => (
                                        <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <input type="checkbox" checked={selectedTenants.includes(t.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedTenants([...selectedTenants, t.id]);
                                                        else setSelectedTenants(selectedTenants.filter(x => x !== t.id));
                                                    }}
                                                    style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{t.name}</span>
                                            </div>
                                            {selectedTenants.includes(t.id) && (
                                                <button type="button" onClick={() => setPrimaryTenantId(t.id)}
                                                    style={{
                                                        padding: "2px 8px", fontSize: 10, fontWeight: 800, borderRadius: 6, border: "1px solid",
                                                        background: primaryTenantId === t.id ? "#6366f1" : "#f1f5f9",
                                                        color: primaryTenantId === t.id ? "#fff" : "#64748b",
                                                        borderColor: primaryTenantId === t.id ? "#6366f1" : "#e2e8f0",
                                                        cursor: "pointer", textTransform: "uppercase"
                                                    }}>
                                                    {primaryTenantId === t.id ? 'Primary' : 'Set Primary'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {selectedTenants.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Select at least one workspace</p>}
                            </div>
                        )}
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

// ── Create Tenant Modal ───────────────────────────────────────────────────────
function CreateTenantModal({ onClose, onCreated, showToast }: {
    onClose: () => void; onCreated: (t: Tenant) => void;
    showToast: (m: string, t: "success" | "error" | "info") => void;
}) {
    const [form, setForm] = useState({ name: "", domain: "", api_key: "" });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return showToast("Name is required", "error");
        setLoading(true);
        try {
            const { data } = await api.post<Tenant>("/super-admin/create-tenant", {
                name: form.name.trim(),
                domain: form.domain.trim() || undefined,
                api_key: form.api_key.trim() || undefined,
            });
            setSuccess(true);
            setTimeout(() => { onCreated(data); onClose(); }, 700);
        } catch (err) {
            showToast((err as Error).message || "Failed to create workspace", "error");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: "100%", height: 44, padding: "0 14px", borderRadius: 10,
        border: "2px solid #e2e8f0", background: "#f8fafc", fontSize: 14,
        color: "#0f172a", outline: "none", boxSizing: "border-box" as const,
        fontFamily: "inherit", transition: "border-color .15s",
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)" }} onClick={onClose} />
            <div style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 25px 80px rgba(0,0,0,.2)", width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Building size={20} color="#fff" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Create Workspace</h2>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>Set up a new tenant environment</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}><X size={16} /></button>
                    </div>
                </div>
                <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Workspace Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Corp" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Custom Domain (Optional)</label>
                            <input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="acme.example.com" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Custom API Key (Optional)</label>
                            <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="Leave blank to auto-generate" style={inputStyle} />
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Cancel</button>
                            <button type="submit" disabled={loading || success}
                                style={{ flex: 1.5, padding: "12px", borderRadius: 12, border: "none", background: success ? "#059669" : "#0f172a", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                {success ? <><Check size={15} /> Created!</> : loading ? <RefreshCw size={15} className="animate-spin" /> : "Create Workspace"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
    const [tab, setTab] = useState<"users" | "roles" | "tenants">("users");
    const [selectedFilterTenant, setSelectedFilterTenant] = useState("all");
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [showCreateTenant, setShowCreateTenant] = useState(false);
    const [managingAccess, setManagingAccess] = useState<User | null>(null);
    const [intelTenant, setIntelTenant] = useState<Tenant | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const { refreshTenants } = useTenant();

    // Expose openIntel to window for table access
    useEffect(() => {
        window.openIntel = (t: Tenant) => setIntelTenant(t);
    }, []);
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [actLoading, setActLoading] = useState(false);

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
            if (auth.isSuperAdmin?.()) {
                const t = await api.get<Tenant[]>("/super-admin/tenants");
                setTenants(t.data);
            }
        } catch { toast("Failed to load data", "error"); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { setIsMounted(true); fetchData(); }, [fetchData]);

    // 🔄 Real-time user updates
    useCRMUpdates((event: CRMUpdateEvent) => {
        if (['USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_TENANTS_CHANGED'].includes(event.type)) {
            console.log('👥 UserManagementPage received sync event:', event);
            fetchData();
        }
    });

    const handleDeactivate = async (user: User) => {
        if (user.id === auth.getUser()?.id) return toast("Cannot deactivate your own account", "error");
        setActLoading(true);
        try {
            await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
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

    const handleManageAccess = async (userId: number, tenantIds: number[], primaryTenantId: number) => {
        setActLoading(true);
        try {
            await api.post("/users/assign-tenants", { user_id: userId, tenant_ids: tenantIds, primary_tenant_id: primaryTenantId });
            toast("User access updated");
            setManagingAccess(null);
            fetchData();
        } catch { toast("Failed to update user access", "error"); }
        finally { setActLoading(false); }
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

    const handleToggleTenant = async (tenant: Tenant) => {
        try {
            await api.patch(`/super-admin/tenants/${tenant.id}`, { is_active: !tenant.is_active });
            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, is_active: !t.is_active } : t));
            toast(`Workspace ${tenant.is_active ? "deactivated" : "activated"}`);
        } catch { toast("Update failed", "error"); }
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
        <>
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
                    {tab === "roles" && <button style={btnOutlined} onClick={() => setShowCreateRole(true)}><Plus size={15} /> New Role</button>}
                    {tab === "tenants" && <button style={btnPrimary} onClick={() => setShowCreateTenant(true)}><Plus size={15} /> Create Workspace</button>}
                    {tab !== "tenants" && <button style={btnPrimary} onClick={() => setShowCreate(true)}><Plus size={15} /> Invite User</button>}
                </div>
            </div>

            {/* Main Card */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,.06)", overflow: "hidden" }}>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 20px", background: "#fff" }}>
                    {([
                        { id: "users", label: "Users List", count: users.length, icon: <Users size={15} />, superOnly: false },
                        { id: "roles", label: "Security Roles", count: roles.length, icon: <Shield size={15} />, superOnly: false },
                        { id: "tenants", label: "Workspaces", count: tenants.length, icon: <Building size={15} />, superOnly: true },
                    ] as const).map(t => {
                        if (t.superOnly && !(isMounted && auth.isSuperAdmin?.())) return null;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "16px 16px",
                                background: "none", border: "none", borderBottom: `2.5px solid ${tab === t.id ? "#6366f1" : "transparent"}`,
                                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                                color: tab === t.id ? "#6366f1" : "#94a3b8", cursor: "pointer", marginBottom: -1,
                                transition: "all .15s",
                            }}>
                                {t.icon}
                                {t.label}
                                <span style={{ padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tab === t.id ? "#eef2ff" : "#f1f5f9", color: tab === t.id ? "#6366f1" : "#94a3b8" }}>
                                    {t.count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Content */}
                {tab === "users" && <UsersTable users={users} roles={roles} tenants={tenants} isLoading={loading} isSuperAdmin={isMounted && (auth.isSuperAdmin?.() || false)}
                    selectedFilterTenant={selectedFilterTenant}
                    onDeactivate={u => setConfirm({ type: "deactivate", user: u })}
                    onDelete={u => setConfirm({ type: "delete", user: u })}
                    onResetPassword={handleReset} onChangeRole={handleRoleChange}
                    onManageAccess={setManagingAccess} onFilterTenant={setSelectedFilterTenant} />}

                {tab === "roles" && <RolesTable roles={roles} isLoading={loading}
                    onDelete={id => setConfirm({ type: "deleteRole", roleId: id })}
                    onEdit={handleEditRole} />}

                {tab === "tenants" && <TenantsTable tenants={tenants} isLoading={loading} onToggleStatus={handleToggleTenant} />}
            </div>

            {/* Modals */}
            {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)}
                onCreated={u => { setUsers(p => [u, ...p]); toast(`"${u.email}" created`); }} showToast={toast} />}
            {showCreateRole && <CreateRoleModal onClose={() => setShowCreateRole(false)}
                onCreated={r => { setRoles(p => [...p, r]); toast(`Role "${r.name}" created`); }} />}
            {managingAccess && <ManageAccessModal user={managingAccess} allTenants={tenants} onClose={() => setManagingAccess(null)} isLoading={actLoading}
                onSave={(ids, pri) => handleManageAccess(managingAccess.id, ids, pri)} />}
            {showCreateTenant && <CreateTenantModal onClose={() => setShowCreateTenant(false)}
                onCreated={async (t) => {
                    setTenants(p => [t, ...p]);
                    toast(`Workspace "${t.name}" created`);
                    await refreshTenants(); // 🔄 Sync global switcher
                }} showToast={toast} />}

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

            {intelTenant && (
                <ManageIntelligenceModal
                    tenant={intelTenant}
                    onClose={() => setIntelTenant(null)}
                />
            )}
            <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </>
    );
}
