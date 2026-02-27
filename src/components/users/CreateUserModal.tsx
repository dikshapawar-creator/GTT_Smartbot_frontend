import { useState, useEffect, useCallback } from "react";
import { X, Send, ChevronDown, UserPlus } from "lucide-react";
import { api } from "@/lib/api";

type UserRole = {
    id: number;
    name: string;
    level: number;
};

// Simplified User and Create types
import { User } from "./types";

const ROLE_BADGE: Record<string, string> = {
    administrator: "bg-red-50 text-red-700 border-red-200",
    manager: "bg-blue-50 text-blue-700 border-blue-200",
    sales: "bg-green-50 text-green-700 border-green-200",
    employee: "bg-gray-50 text-gray-700 border-gray-200"
};

const EMPTY_FORM = {
    email: "",
    password: "",
    role_name: "sales" as string,
    is_active: true,
    send_invite: false,
};

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>;

interface CreateUserModalProps {
    onClose: () => void;
    onCreated: (user: User) => void;
    isSuperAdmin: boolean;
    showToast: (msg: string, type: "success" | "error") => void;
}

export function CreateUserModal({ onClose, onCreated, isSuperAdmin, showToast }: CreateUserModalProps) {
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);

    const fetchRoles = useCallback(async () => {
        setIsLoadingRoles(true);
        try {
            const { data } = await api.get<UserRole[]>("/roles/");
            const filtered = isSuperAdmin ? data : data.filter(r => r.name !== "administrator");
            setRoles(filtered);
            if (filtered.length > 0 && !form.role_name) {
                setForm(f => ({ ...f, role_name: filtered[0].name }));
            }
        } catch {
            showToast("Failed to load roles", "error");
        } finally {
            setIsLoadingRoles(false);
        }
    }, [isSuperAdmin, form.role_name, showToast]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const field = (key: keyof typeof EMPTY_FORM, val: string | boolean) =>
        setForm((f) => ({ ...f, [key]: val }));

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";

        const selectedRole = roles.find(r => r.name === form.role_name);
        if (!selectedRole) e.role_name = "Please select a valid role";

        if (!form.password && !form.send_invite) e.password = "Password required (or enable Send Invite)";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                email: form.email.trim(),
                password: form.password || undefined,
                role_name: form.role_name,
                is_active: form.is_active,
            };
            const { data: created } = await api.post<User>("/users/create", payload);
            onCreated(created);
            showToast(`User "${created.email}" created successfully`, "success");
            setForm({ ...EMPTY_FORM });
            setErrors({});
            onClose();
        } catch (err) {
            showToast((err as Error).message || "Failed to create user", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[500px] p-0 animate-scale-in flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
                        <p className="text-sm text-gray-500 mt-1">Add a new user to your system</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form scrollable area */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => field("email", e.target.value)}
                                placeholder="user@company.com"
                                className={`w-full h-11 px-4 rounded-lg border outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                    ${errors.email ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"}`}
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={form.role_name}
                                    onChange={(e) => field("role_name", e.target.value)}
                                    disabled={isLoadingRoles}
                                    className={`w-full h-11 px-4 rounded-lg border outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none text-sm
                                        ${errors.role_name ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                                >
                                    {isLoadingRoles ? (
                                        <option>Loading roles...</option>
                                    ) : (
                                        roles.map((r) => (
                                            <option key={r.id} value={r.name} className="capitalize">{r.name.replace(/_/g, ' ')}</option>
                                        ))
                                    )}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                            {errors.role_name && <p className="text-xs text-red-500 mt-1">{errors.role_name}</p>}

                            {/* Role badge preview */}
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                                Permissions Level:
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_BADGE[form.role_name] ?? ROLE_BADGE.employee}`}>
                                    {form.role_name.replace(/_/g, ' ')} (Level {roles.find(r => r.name === form.role_name)?.level || '?'})
                                </span>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password{" "}
                                {form.send_invite
                                    ? <span className="text-gray-400 font-normal">(optional when invite is on)</span>
                                    : <span className="text-red-500">*</span>
                                }
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => field("password", e.target.value)}
                                placeholder="Minimum 8 characters"
                                className={`w-full h-11 px-4 rounded-lg border outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                    ${errors.password ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"}`}
                            />
                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col gap-3.5 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <button
                                    type="button"
                                    onClick={() => field("is_active", !form.is_active)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                                <span className="text-sm text-gray-700">Set as Active on creation</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <button
                                    type="button"
                                    onClick={() => field("send_invite", !form.send_invite)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${form.send_invite ? "bg-blue-600" : "bg-gray-300"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${form.send_invite ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                                <span className="text-sm text-gray-700">Send Invite Email</span>
                                <Send className="h-3.5 w-3.5 text-gray-400" />
                            </label>
                        </div>

                        {/* Info box */}
                        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
                            <strong>Note:</strong> The user will be assigned to your tenant automatically. Role permissions are determined by the selected role above.
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        form="create-user-form"
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                            : <><UserPlus className="h-4 w-4" /> Create User</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
