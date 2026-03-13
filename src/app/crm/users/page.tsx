"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Shield, Plus, Download, Search, LayoutGrid, List } from "lucide-react";
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
        } catch (err) {
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
        } catch (err) {
            alert("Failed to delete role. Ensure no users are assigned to it.");
        } finally {
            setIsDeletingRole(false);
        }
    };

    return (
        <Dashboard>
            <div className="min-h-screen bg-[#F8FAFC]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
                        <div className="space-y-2">
                            <div
                                className="flex items-center gap-2 mb-1"
                            >
                                <div className="h-1.5 w-6 bg-blue-600 rounded-full" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Admin Control</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                                <p className="text-sm font-medium text-slate-500 mt-1">Manage team members and roles here.</p>
                            </div>
                        </div>

                        {/* High-Contrast Actions */}
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95">
                                <Download className="h-4 w-4" />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={() => setShowCreateUser(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-sm font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create User</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs - Modern Segmented Control */}
                    <div className="inline-flex p-1 bg-slate-200/60 rounded-xl mb-10 border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`flex items-center gap-2.5 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200
                                ${activeTab === "users"
                                    ? "bg-white text-blue-600 shadow-md translate-y-0"
                                    : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <Users className="h-4 w-4" />
                            Users List
                            {users.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${activeTab === "users" ? "bg-blue-50 text-blue-600" : "bg-slate-300/50 text-slate-600"}`}>
                                    {users.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("roles")}
                            className={`flex items-center gap-2.5 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200
                                ${activeTab === "roles"
                                    ? "bg-white text-blue-600 shadow-md translate-y-0"
                                    : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <Shield className="h-4 w-4" />
                            Security Roles
                            {roles.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${activeTab === "roles" ? "bg-blue-50 text-blue-600" : "bg-slate-300/50 text-slate-600"}`}>
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
                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
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
