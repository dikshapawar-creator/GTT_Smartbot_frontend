"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Search, Shield, UserCheck, Power, PowerOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard/Dashboard";

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

function UserManagementContent() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Auth context for RBAC
    const currentUser = auth.getUser();
    const isSuperAdmin = currentUser?.role === 'administrator';

    const [newUserData, setNewUserData] = useState({
        full_name: "",
        email: "",
        password: "",
        role: "sales",
        is_active: true
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get<User[]>("/users/");
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // RBAC: Admin cannot create administrator
        if (newUserData.role === 'administrator' && !isSuperAdmin) {
            alert("Only System Administrators can create other administrators.");
            return;
        }

        setIsCreating(true);
        try {
            const { data: resp } = await api.post<User>("/users/", newUserData);
            setUsers([resp, ...users]);
            setIsModalOpen(false);
            setNewUserData({
                full_name: "",
                email: "",
                password: "",
                role: "sales",
                is_active: true
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to create user.";
            alert(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (id === currentUser?.id) {
            alert("Self-deletion is not permitted for security reasons.");
            return;
        }

        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        try {
            await api.delete(`/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch {
            alert("Failed to delete user. Please try again.");
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert("You cannot deactivate your own account.");
            return;
        }

        try {
            const { data: updated } = await api.put<User>(`/users/${user.id}`, { is_active: !user.is_active });
            setUsers(users.map(u => u.id === user.id ? updated : u));
        } catch {
            alert("Failed to update user status.");
        }
    };

    const filteredUsers = users.filter((user: User) =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[11px] mb-2">
                        <Shield className="w-3.5 h-3.5" />
                        System Administration
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-500 font-medium">Provision and manage enterprise roles across the Trade Intelligence network.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-primary hover:bg-primary-dark text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-primary/20 flex gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <UserPlus className="h-4 w-4" /> Provision New User
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Entities', value: users.length, icon: <Users />, color: 'primary' },
                    { label: 'Active Access', value: users.filter(u => u.is_active).length, icon: <UserCheck />, color: 'emerald' },
                    { label: 'Privileged Access', value: users.filter(u => u.role === 'admin' || u.role === 'administrator').length, icon: <Shield />, color: 'indigo' },
                    { label: 'Security Alerts', value: '0', icon: <ShieldAlert className="w-5 h-5" />, color: 'slate' },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search & Table */}
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Identify user by name or email..."
                            className="bg-white pl-11 h-11 border-slate-200 rounded-xl focus:ring-primary/10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Entity / Credentials</TableHead>
                                <TableHead className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">System Role</TableHead>
                                <TableHead className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Account Status</TableHead>
                                <TableHead className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-right">Administrative Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="animate-pulse flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Hydrating Security Registry...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center text-slate-400 font-medium">
                                        No entity records found in current scope.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <TableCell className="py-5 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-600 border border-slate-200 uppercase tracking-tighter">
                                                    {user.full_name?.charAt(0) || user.email.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 tracking-tight">{user.full_name}</span>
                                                    <span className="text-xs font-medium text-slate-400">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md bg-opacity-10 ${user.role === 'administrator' ? 'bg-primary text-primary' :
                                                    user.role === 'admin' ? 'bg-indigo-500 text-indigo-600' :
                                                        'bg-slate-500 text-slate-600'
                                                    }`}>
                                                    <Shield className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                                                    {user.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {user.is_active ? 'Authorized' : 'Suspended'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-9 w-9 p-0 rounded-lg ${user.is_active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    onClick={() => handleToggleStatus(user)}
                                                    title={user.is_active ? 'Suspend Access' : 'Restore Access'}
                                                >
                                                    {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="De-provision Entity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Provisioning Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Provision New Entity"
            >
                <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="space-y-4 pt-2">
                        <Input
                            label="Entity Full Name"
                            placeholder="John Doe"
                            required
                            value={newUserData.full_name}
                            onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                            className="h-12 rounded-xl"
                        />
                        <Input
                            label="Corporate Identification (Email)"
                            type="email"
                            placeholder="john@eximtradedata.com"
                            required
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="h-12 rounded-xl"
                        />
                        <Input
                            label="Restricted Secure Key"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            className="h-12 rounded-xl"
                        />

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Tier</label>
                                <select
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                                    value={newUserData.role}
                                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                                >
                                    <option value="sales">Sales & Logistics</option>
                                    <option value="it_team">IT Operations</option>
                                    <option value="admin">Regional Admin</option>
                                    {isSuperAdmin && <option value="administrator">System Admin</option>}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Status</label>
                                <div className="flex items-center h-12 px-4 border border-slate-200 rounded-xl bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={newUserData.is_active}
                                        onChange={(e) => setNewUserData({ ...newUserData, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary mr-3"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Immediate Access</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-colors"
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20"
                            type="submit"
                            isLoading={isCreating}
                        >
                            Confirm Authorization
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function UserManagementPage() {
    return (
        <Dashboard>
            <UserManagementContent />
        </Dashboard>
    );
}
