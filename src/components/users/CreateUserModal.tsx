import { useState, useEffect, useCallback } from "react";
import { X, Send, ChevronDown, UserPlus, Mail, Lock, Shield, Eye, EyeOff, Sparkles, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { User } from "./types";

type UserRole = {
    id: number;
    name: string;
    level: number;
};

const ROLE_BADGE: Record<string, string> = {
    administrator: "bg-purple-50 text-purple-700 border-purple-200",
    manager: "bg-blue-50 text-blue-700 border-blue-200",
    sales: "bg-emerald-50 text-emerald-700 border-emerald-200",
    employee: "bg-slate-50 text-slate-700 border-slate-200"
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
    const [showPassword, setShowPassword] = useState(false);

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
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />

            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header with Background Gradient */}
                <div className="relative px-8 pt-8 pb-6 shrink-0 overflow-hidden">
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                                <UserPlus className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New User</h2>
                                <p className="text-sm font-medium text-slate-500 mt-0.5">Fill in the details to create a new user.</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Form scrollable area */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scrollbar-hide">
                    <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">

                        {/* Email Field Group */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                                <Mail className="h-4 w-4 text-slate-400" />
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => field("email", e.target.value)}
                                    placeholder="e.g. user@company.com"
                                    className={`w-full h-12 px-4 rounded-xl border-2 outline-none transition-all duration-200 text-slate-900 font-medium
                                        ${errors.email
                                            ? "border-red-200 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                            : "border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-slate-900 focus:bg-white transition-all"
                                        }`}
                                />
                                {errors.email && (
                                    <p className="text-xs font-bold text-red-500 mt-1.5 px-1 bg-red-50/50 py-1 rounded w-fit">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Role Selection Group */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                                <Shield className="h-4 w-4 text-slate-400" />
                                User Role <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <select
                                    value={form.role_name}
                                    onChange={(e) => field("role_name", e.target.value)}
                                    disabled={isLoadingRoles}
                                    className="w-full h-12 pl-4 pr-12 rounded-xl border-2 border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-slate-900 focus:bg-white transition-all appearance-none text-slate-900 font-medium cursor-pointer"
                                >
                                    {isLoadingRoles ? (
                                        <option>Loading roles...</option>
                                    ) : (
                                        roles.map((r) => (
                                            <option key={r.id} value={r.name} className="capitalize">{r.name.replace(/_/g, ' ')}</option>
                                        ))
                                    )}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-900 transition-colors">
                                    <ChevronDown className="h-5 w-5" />
                                </div>
                            </div>

                            {/* Visual Role Preview Card */}
                            <div className="mt-3 p-3 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                        <CheckCheck className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="text-[11px] font-bold text-indigo-800 tracking-wide uppercase">
                                        Level {roles.find(r => r.name === form.role_name)?.level ?? '?'} Clearance
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.05em] border-2 shadow-sm ${ROLE_BADGE[form.role_name] ?? ROLE_BADGE.employee}`}>
                                    {form.role_name.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Password Field Group */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                                <Lock className="h-4 w-4 text-slate-400" />
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => field("password", e.target.value)}
                                    placeholder="8+ characters"
                                    className={`w-full h-12 pl-4 pr-12 rounded-xl border-2 outline-none transition-all duration-200 text-slate-900 font-medium
                                        ${errors.password
                                            ? "border-red-200 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                            : "border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 focus:border-slate-900 focus:bg-white transition-all"
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                                {errors.password && (
                                    <p className="text-xs font-bold text-red-500 mt-1.5 px-1 bg-red-50/50 py-1 rounded w-fit">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Status Toggle */}
                        <div className="pt-2">
                            <div
                                onClick={() => field("is_active", !form.is_active)}
                                className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer select-none
                                    ${form.is_active ? "border-slate-900 bg-slate-50" : "border-slate-100 bg-white opacity-60"}
                                `}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center mr-3 transition-colors ${form.is_active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"}`}>
                                    {form.is_active && <CheckCheck className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-sm font-bold text-slate-900">Active User</span>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer with Gradient Primary Button */}
                <div className="px-8 py-8 shrink-0 bg-white border-t border-slate-100 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        form="create-user-form"
                        type="submit"
                        disabled={loading}
                        className="flex-[1.5] px-6 py-3.5 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-sm font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="h-5 w-5" />
                                <span>CREATE USER</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
