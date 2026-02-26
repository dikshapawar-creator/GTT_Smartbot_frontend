"use client";

import React, { useState, useEffect } from "react";
import {
    UserPlus,
    Trash2,
    Search,
    Power,
    PowerOff
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard/Dashboard";

interface User {
    id: number;
    full_name: string;
    email: string;
    role:
    | {
        name?: string;
        level?: number;
    }
    | string
    | null;
    is_active: boolean;
    created_at: string;
}

function UserManagementContent() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const currentUser = auth.getUser();

    // 🔐 Safe role extraction for current user (RBAC hardened)
    const getSafeRoleString = (role: unknown): string => {
        if (typeof role === "string") return role;

        if (
            typeof role === "object" &&
            role !== null &&
            "name" in role
        ) {
            const roleObj = role as { name?: unknown };
            if (typeof roleObj.name === "string") {
                return roleObj.name;
            }
        }

        return "";
    };

    const currentUserRole = getSafeRoleString(currentUser?.role);
    const isSuperAdmin = currentUserRole === "administrator";

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

        if (newUserData.role === "administrator" && !isSuperAdmin) {
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
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create user.";
            alert(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (id === currentUser?.id) {
            alert("Self-deletion is not permitted.");
            return;
        }

        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            await api.delete(`/users/${id}`);
            setUsers(users.filter((u) => u.id !== id));
        } catch {
            alert("Failed to delete user.");
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert("You cannot deactivate your own account.");
            return;
        }

        try {
            const { data: updated } = await api.put<User>(
                `/users/${user.id}`,
                { is_active: !user.is_active }
            );

            setUsers(users.map((u) => (u.id === user.id ? updated : u)));
        } catch {
            alert("Failed to update user status.");
        }
    };

    const filteredUsers = users.filter((user) =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 🔒 Bulletproof role getter
    const getRoleName = (user: User): string => {
        if (typeof user.role === "string") return user.role;

        if (
            typeof user.role === "object" &&
            user.role !== null &&
            typeof user.role.name === "string"
        ) {
            return user.role.name;
        }

        return "";
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold">User Management</h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    New User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search users..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>

                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.map((user) => {
                                const roleName = getRoleName(user);

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            {user.full_name}
                                            <br />
                                            <span className="text-xs text-gray-400">
                                                {user.email}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            {String(roleName).replace("_", " ")}
                                        </TableCell>

                                        <TableCell>
                                            {user.is_active
                                                ? "Active"
                                                : "Inactive"}
                                        </TableCell>

                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    handleToggleStatus(user)
                                                }
                                            >
                                                {user.is_active ? (
                                                    <PowerOff className="h-4 w-4" />
                                                ) : (
                                                    <Power className="h-4 w-4" />
                                                )}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    handleDeleteUser(user.id)
                                                }
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create User"
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <Input
                        label="Full Name"
                        required
                        value={newUserData.full_name}
                        onChange={(e) =>
                            setNewUserData({
                                ...newUserData,
                                full_name: e.target.value
                            })
                        }
                    />

                    <Input
                        label="Email"
                        type="email"
                        required
                        value={newUserData.email}
                        onChange={(e) =>
                            setNewUserData({
                                ...newUserData,
                                email: e.target.value
                            })
                        }
                    />

                    <Input
                        label="Password"
                        type="password"
                        required
                        value={newUserData.password}
                        onChange={(e) =>
                            setNewUserData({
                                ...newUserData,
                                password: e.target.value
                            })
                        }
                    />

                    <Button type="submit" isLoading={isCreating}>
                        Create
                    </Button>
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
