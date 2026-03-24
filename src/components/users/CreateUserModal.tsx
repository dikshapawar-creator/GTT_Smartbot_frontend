import { useState, useEffect, useCallback } from "react";
import {
    X, ChevronDown, UserPlus, Mail, Lock, Shield,
    Eye, EyeOff, CheckCheck, Check, RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { User, ROLE_COLORS } from "./types";

type UserRole = { id: number; name: string; level: number };

const EMPTY_FORM = {
    email: "",
    password: "",
    role_name: "sales",
    is_active: true,
    send_invite: false,
};

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>;

const PASSWORD_REQS = [
    { regex: /.{8,}/, label: "8+ chars" },
    { regex: /[A-Z]/, label: "Upper" },
    { regex: /[a-z]/, label: "Lower" },
    { regex: /[0-9]/, label: "Number" },
    { regex: /[^A-Za-z0-9]/, label: "Special" },
];

interface CreateUserModalProps {
    onClose: () => void;
    onCreated: (user: User) => void;
    canManage: boolean;
    showToast: (msg: string, type: "success" | "error") => void;
}

export function CreateUserModal({ onClose, onCreated, canManage, showToast }: CreateUserModalProps) {
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const fetchRoles = useCallback(async () => {
        try {
            const { data } = await api.get<UserRole[]>("/roles/");
            const profile = auth.getUser();
            const currentLevel = profile?.role_level || 0;
            const isSuper = auth.isAdmin();

            const filtered = isSuper
                ? data
                : data.filter((r: UserRole) => r.level < currentLevel);

            setRoles(filtered);
            if (filtered.length > 0 && !form.role_name) {
                setForm(f => ({ ...f, role_name: filtered[0].name }));
            }
        } catch {
            showToast("Failed to load roles", "error");
        } finally {
        }
    }, [canManage, showToast, form.role_name]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const field = (key: keyof typeof EMPTY_FORM, val: string | boolean) =>
        setForm((f) => ({ ...f, [key]: val }));

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";

        if (!form.send_invite) {
            if (!form.password) e.password = "Password required (or enable Send Invite)";
            else if (PASSWORD_REQS.some(r => !r.regex.test(form.password))) {
                e.password = "Password does not meet requirements";
            }
        }
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
            setSuccess(true);
            setTimeout(() => {
                onCreated(created);
                onClose();
            }, 800);
        } catch (err) {
            showToast((err as Error).message || "Failed to create user", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-10 pt-10 pb-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                                <UserPlus className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New User</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Team invitation system</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-all active:scale-90">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-10 pb-6 space-y-6">
                    <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <Mail className="h-3.5 w-3.5" /> Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => field("email", e.target.value)}
                                placeholder="user@company.com"
                                className={`w-full h-12 px-5 rounded-2xl border-2 outline-none text-sm font-bold transition-all
                                    ${errors.email ? "border-rose-200 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 focus:border-slate-900 focus:bg-white"}`}
                            />
                            {errors.email && <p className="text-[11px] font-bold text-rose-600 px-1">{errors.email}</p>}
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <Shield className="h-3.5 w-3.5" /> Assign Role <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <select
                                    value={form.role_name}
                                    onChange={e => field("role_name", e.target.value)}
                                    className="w-full h-12 pl-5 pr-12 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-slate-900 focus:bg-white text-sm font-bold appearance-none cursor-pointer outline-none transition-all"
                                >
                                    {roles.map(r => <option key={r.id} value={r.name} className="capitalize">{r.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 pointer-events-none transition-colors" />
                            </div>

                            {/* Role Context Card */}
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                                        Level {roles.find(r => r.name === form.role_name)?.level ?? "0"} Access
                                    </span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border shadow-sm ${ROLE_COLORS[form.role_name] || ROLE_COLORS.employee}`}>
                                    {form.role_name}
                                </span>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <Lock className="h-3.5 w-3.5" /> Secure Password {!form.send_invite && <span className="text-rose-500">*</span>}
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={e => field("password", e.target.value)}
                                    disabled={form.send_invite}
                                    placeholder={form.send_invite ? "System generated after invite" : "8+ characters"}
                                    className={`w-full h-12 pl-5 pr-12 rounded-2xl border-2 outline-none text-sm font-bold transition-all disabled:opacity-40 disabled:bg-slate-50
                                        ${errors.password ? "border-rose-200 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 focus:border-slate-900 focus:bg-white"}`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={form.send_invite}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {form.password && !form.send_invite && (
                                <div className="flex flex-wrap gap-1.5 pt-1 px-1">
                                    {PASSWORD_REQS.map((req, i) => {
                                        const met = req.regex.test(form.password);
                                        return (
                                            <span key={i} className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all
                                                ${met ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                                                {req.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.password && <p className="text-[11px] font-bold text-rose-600 px-1">{errors.password}</p>}
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 gap-3">
                            <button type="button" onClick={() => { field("send_invite", !form.send_invite); if (!form.send_invite) field("password", ""); }}
                                className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all text-left shadow-sm
                                ${form.send_invite ? "border-indigo-600 bg-indigo-50 shadow-indigo-100" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}>
                                <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${form.send_invite ? "bg-indigo-600 rotate-0" : "bg-slate-200 -rotate-90"}`}>
                                    {form.send_invite && <Check className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900">Send Email Invitation</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">User sets password via email</span>
                                </div>
                            </button>

                            <button type="button" onClick={() => field("is_active", !form.is_active)}
                                className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all text-left shadow-sm
                                ${form.is_active ? "border-slate-900 bg-slate-50 shadow-slate-100" : "border-slate-100 bg-white"}`}>
                                <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${form.is_active ? "bg-slate-900" : "bg-slate-200"}`}>
                                    {form.is_active && <CheckCheck className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900">Immediate Activation</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grant access immediately</span>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-10 py-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                    <button type="button" onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest">
                        Cancel
                    </button>
                    <button form="create-user-form" type="submit" disabled={loading || success}
                        className={`flex-[1.8] px-6 py-4 rounded-2xl text-white text-sm font-black transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg
                        ${success ? "bg-emerald-500 shadow-emerald-200" : "bg-slate-900 shadow-slate-200 hover:bg-slate-800"}`}>
                        {success ? (
                            <><Check className="h-5 w-5 animate-in zoom-in" /><span className="uppercase tracking-widest">USER CREATED</span></>
                        ) : loading ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                            <><UserPlus className="h-5 w-5" /><span className="uppercase tracking-widest">CREATE MEMBER</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
