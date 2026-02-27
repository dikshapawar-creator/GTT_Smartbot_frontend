"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard/Dashboard";

// Sub-components
import { User, UserRole } from "@/components/users/types";
import { UsersTable } from "@/components/users/UsersTable";
import { RolesTable } from "@/components/users/RolesTable";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { CreateRoleModal } from "@/components/users/CreateRoleModal";
import { ChangeRoleModal } from "@/components/users/ChangeRoleModal";
import { DeactivateModal } from "@/components/users/DeactivateModal";

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border animate-slide-in-right
            ${type === "success"
                ? "bg-white border-emerald-200 text-emerald-700"
                : "bg-white border-red-200 text-red-600"}`}>
            {type === "success"
                ? <CheckCheck className="h-5 w-5 shrink-0" />
                : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onDismiss} className="ml-2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function UserManagementPage() {
    const router = useRouter();

    // UI State
    const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
    const [mode, setMode] = useState<"list" | "createUser" | "createRole">("list");
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Target State
    const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
    const [changeRoleTarget, setChangeRoleTarget] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Auth & Permissions
    const currentUser = auth.getUser();
    const isSuperAdmin = (() => {
        const r = currentUser?.role;
        if (typeof r === "string") return r === "administrator";
        if (r && typeof r === "object" && "name" in r) return (r as { name?: string }).name === "administrator";
        return false;
    })();

    const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
    }, []);

    useEffect(() => {
        // Access Control Guard
        const user = auth.getUser();
        if (user && user.role_level && user.role_level < 2) {
            router.push('/crm/dashboard');
            return;
        }

        fetchUsers();
        fetchRoles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRoles = async () => {
        try {
            const { data } = await api.get<UserRole[]>("/roles/");
            setRoles(data);
        } catch (error) {
            console.error("Failed to load roles", error);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get<User[]>("/users/");
            setUsers(data);
        } catch {
            showToast("Failed to load users", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Actions ──
    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setActionLoading(true);
        try {
            await api.delete(`/users/${deactivateTarget.id}`);
            // Mark inactive locally
            setUsers((prev) =>
                prev.map((u) => u.id === deactivateTarget.id ? { ...u, is_active: false } : u)
            );
            showToast(`${deactivateTarget.email} has been deactivated`, "success");
        } catch (err) {
            showToast((err as Error).message || "Deactivation failed", "error");
        } finally {
            setActionLoading(false);
            setDeactivateTarget(null);
        }
    };

    const handleRoleUpdate = async (newRoleName: string) => {
        if (!changeRoleTarget) return;
        setActionLoading(true);
        try {
            const { data: updated } = await api.put<User>(`/users/${changeRoleTarget.id}`, {
                role_name: newRoleName
            });
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
            showToast(`Role updated for ${updated.email}`, "success");
            setChangeRoleTarget(null);
        } catch (err) {
            showToast((err as Error).message || "Role update failed", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteRole = async (id: number) => {
        if (!confirm("Are you sure you want to delete this role? This cannot be undone.")) return;
        try {
            await api.delete(`/roles/${id}`);
            setRoles(roles.filter(r => r.id !== id));
            showToast("Role deleted successfully", "success");
        } catch (error: unknown) {
            showToast((error as Error).message || "Failed to delete role", "error");
        }
    };

    return (
        <Dashboard>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8">

                    {/* ── Global Toast ── */}
                    {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

                    {/* ── Modals ── */}
                    {mode === "createUser" && (
                        <CreateUserModal
                            isSuperAdmin={isSuperAdmin}
                            onClose={() => setMode("list")}
                            onCreated={(user) => setUsers(prev => [user, ...prev])}
                            showToast={showToast}
                        />
                    )}

                    {mode === "createRole" && (
                        <CreateRoleModal
                            onClose={() => setMode("list")}
                            onCreated={(role) => setRoles(prev => [...prev, role])}
                            showToast={showToast}
                        />
                    )}

                    {deactivateTarget && (
                        <DeactivateModal
                            userEmail={deactivateTarget.email}
                            loading={actionLoading}
                            onConfirm={handleDeactivate}
                            onCancel={() => setDeactivateTarget(null)}
                        />
                    )}

                    {changeRoleTarget && (
                        <ChangeRoleModal
                            user={changeRoleTarget}
                            roles={roles}
                            loading={actionLoading}
                            onConfirm={handleRoleUpdate}
                            onCancel={() => setChangeRoleTarget(null)}
                        />
                    )}

                    {/* ── Header ── */}
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                User Management
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 mb-6">
                                Manage users, roles and permissions
                            </p>

                            {/* Segmented Tabs Component styled per Vercel/Enterprise standards */}
                            <div className="inline-flex bg-gray-200/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("users")}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "users"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Users
                                </button>
                                <button
                                    onClick={() => setActiveTab("roles")}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "roles"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Roles & Permissions
                                </button>
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-4 mb-2">
                            {activeTab === "users" ? (
                                <>
                                    <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm">
                                        Export
                                    </button>
                                    <button
                                        onClick={() => setMode("createUser")}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
                                    >
                                        + Create User
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setMode("createRole")}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
                                >
                                    + Create Role
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Main Content Area ── */}
                    {activeTab === "users" ? (
                        <>
                            {/* Metrics just for users page */}
                            <div className="grid grid-cols-3 gap-6 mb-8 animate-fade-in">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-sm text-gray-500">Total Users</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1">{users.length}</p>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-sm text-gray-500">Active Users</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                                        {users.filter(u => u.is_active).length}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-sm text-gray-500">Inactive Users</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                                        {users.filter(u => !u.is_active).length}
                                    </p>
                                </div>
                            </div>

                            <UsersTable
                                users={users}
                                roles={roles}
                                isLoading={isLoading}
                                onChangeRole={(user) => setChangeRoleTarget(user)}
                                onDeactivate={(user) => setDeactivateTarget(user)}
                            />
                        </>
                    ) : (
                        <RolesTable
                            roles={roles}
                            isLoading={isLoading}
                            onEdit={() => showToast("Edit role coming soon", "success")}
                            onDelete={handleDeleteRole}
                        />
                    )}

                </div>
            </div>
        </Dashboard>
    );
}
