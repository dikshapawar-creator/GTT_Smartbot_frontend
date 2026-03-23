"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Shield, Plus, Download } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { UsersTable } from "@/components/users/UsersTable";
import { RolesTable } from "@/components/users/RolesTable";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { CreateRoleModal } from "@/components/users/CreateRoleModal";
import { DeactivateModal } from "@/components/users/DeactivateModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { User, UserRole } from "@/components/users/types";
import Dashboard from "@/components/Dashboard/Dashboard";

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);

    // Confirmation Modal state
    const [confirmDeleteRole, setConfirmDeleteRole] = useState<number | null>(null);
    const [isDeletingRole, setIsDeletingRole] = useState(false);

    const currentUser = auth.getUser();
    const isSuperAdmin = currentUser?.role === "administrator";

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [uRes, rRes] = await Promise.all([
                api.get<User[]>("/users/"),
                api.get<UserRole[]>("/roles/")
            ]);
            setUsers(uRes.data);
            setRoles(rRes.data);
        } catch (err) {
            console.error("Failed to fetch user management data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeactivate = async () => {
        if (!deactivatingUser) return;
        setDeactivateLoading(true);
        try {
            await api.post(`/users/${deactivatingUser.id}/deactivate`);
            setUsers(users.map(u => u.id === deactivatingUser.id ? { ...u, is_active: false } : u));
            setDeactivatingUser(null);
        } catch {
            alert("Failed to deactivate user");
        } finally {
            setDeactivateLoading(false);
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        setIsDeletingRole(true);
        try {
            await api.delete(`/roles/${roleId}`);
            setRoles(roles.filter(r => r.id !== roleId));
            setConfirmDeleteRole(null);
        } catch {
            alert("Failed to delete role. Ensure no users are assigned to it.");
        } finally {
            setIsDeletingRole(false);
        }
    };

    return (
        <Dashboard>
            <div className="min-h-screen bg-[#F8FAFC]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6">

                    {/* Enhanced Hero Section */}
                    <div className="flex items-center justify-between p-6 mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/10">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="h-3 w-3 text-indigo-400" />
                                <span className="text-[10px] font-medium text-indigo-400 lowercase tracking-wide">Admin control</span>
                            </div>
                            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">User Management</h1>
                            <p className="text-[11px] text-slate-400">Manage team members, roles and access permissions</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:border-slate-500 transition-all">
                                <Download className="h-3 w-3" />
                                Export
                            </button>
                            <button
                                onClick={() => setShowCreateUser(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all"
                            >
                                <Plus className="h-3 w-3" />
                                Invite User
                            </button>
                        </div>
                    </div>

                    {/* Container with tabs and content */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-white px-6">
                            <button
                                onClick={() => setActiveTab("users")}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                                    activeTab === "users"
                                        ? "border-indigo-600 text-indigo-600 bg-white"
                                        : "border-transparent text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <Users className="h-3 w-3" />
                                Users list
                                {users.length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                        activeTab === "users" 
                                            ? "bg-indigo-100 text-indigo-600" 
                                            : "bg-slate-100 text-slate-600"
                                    }`}>
                                        {users.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("roles")}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                                    activeTab === "roles"
                                        ? "border-indigo-600 text-indigo-600 bg-white"
                                        : "border-transparent text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <Shield className="h-3 w-3" />
                                Security roles
                                {roles.length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                        activeTab === "roles" 
                                            ? "bg-indigo-100 text-indigo-600" 
                                            : "bg-slate-100 text-slate-600"
                                    }`}>
                                        {roles.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Content Section */}
                        <div>
                            {activeTab === "users" ? (
                                <UsersTable
                                    users={users}
                                    roles={roles}
                                    isLoading={loading}
                                    onDeactivate={(u) => setDeactivatingUser(u)}
                                    onChangeRole={() => fetchData()}
                                />
                            ) : (
                                <div className="bg-white overflow-hidden">
                                    <RolesTable
                                        roles={roles}
                                        isLoading={loading}
                                        onDelete={(id) => setConfirmDeleteRole(id)}
                                        onEdit={(role) => console.log("Edit role", role)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Premium Modals */}
                {showCreateUser && (
                    <CreateUserModal
                        onClose={() => setShowCreateUser(false)}
                        onCreated={(u) => { setUsers([u, ...users]); setShowCreateUser(false); fetchData(); }}
                        isSuperAdmin={isSuperAdmin}
                        showToast={(m, t) => console.log(m, t)}
                    />
                )}
                {showCreateRole && (
                    <CreateRoleModal
                        onClose={() => setShowCreateRole(false)}
                        onCreated={(r) => { setRoles([...roles, r]); setShowCreateRole(false); }}
                        showToast={(m, t) => console.log(m, t)}
                    />
                )}
                {deactivatingUser && (
                    <DeactivateModal
                        userEmail={deactivatingUser.email}
                        loading={deactivateLoading}
                        onConfirm={handleDeactivate}
                        onCancel={() => setDeactivatingUser(null)}
                    />
                )}
                {confirmDeleteRole && (
                    <ConfirmationModal
                        isOpen={true}
                        variant="danger"
                        title="Delete Security Role?"
                        message="This action is permanent. You can only delete roles that are not currently assigned to any team members."
                        confirmLabel="DELETE ROLE"
                        cancelLabel="KEEP ROLE"
                        isLoading={isDeletingRole}
                        onConfirm={() => handleDeleteRole(confirmDeleteRole)}
                        onCancel={() => setConfirmDeleteRole(null)}
                    />
                )}
            </div>
        </Dashboard>
    );
}
