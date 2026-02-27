export interface UserRole {
    id: number;
    name: string;
    level: number;
    description?: string;
}

export interface User {
    id: number;
    email: string;
    is_active: boolean;
    tenant_id?: number;
    role: UserRole | string | null;
    created_at: string;
    updated_at?: string | null;
}

export type SortKey = "email" | "role" | "is_active" | "created_at" | "id";
export type SortDir = "asc" | "desc";

export const ROLES = ["administrator", "manager", "sales", "employee"] as const;
export type RoleName = typeof ROLES[number];

export const ROLE_BADGE: Record<string, string> = {
    administrator: "bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]",
    administrator_level_3: "bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]",
    admin: "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]",
    sales: "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]",
    employee: "bg-gray-100 text-gray-600 border border-gray-200",
};

export const STATUS_BADGE = {
    active: "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]",
    inactive: "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]",
};

export function getRoleName(user: User): string {
    if (typeof user.role === "string") return user.role.toLowerCase();
    if (user.role && typeof user.role === "object" && "name" in user.role)
        return (user.role as UserRole).name.toLowerCase();
    return "employee";
}

export function getInitials(email: string): string {
    return email.slice(0, 2).toUpperCase();
}

export function avatarBg(email: string): string {
    const colors = [
        "bg-blue-500", "bg-purple-500", "bg-emerald-500",
        "bg-rose-500", "bg-amber-500", "bg-indigo-500",
        "bg-teal-500", "bg-cyan-500",
    ];
    let h = 0;
    for (const c of email) h = (h << 5) - h + c.charCodeAt(0);
    return colors[Math.abs(h) % colors.length];
}

export function formatDate(iso: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}
