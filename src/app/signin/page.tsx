"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, BarChart3, ShieldAlert, Users2 } from "lucide-react";

import AuthLayout from "@/components/auth/AuthLayout";
import InputField from "@/components/auth/InputField";
import GradientButton from "@/components/auth/GradientButton";
import FeatureCard from "@/components/auth/FeatureCard";
import { api } from "@/lib/api";
import { auth, type UserProfile } from "@/lib/auth";

interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: UserProfile;
}

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function SignInContent() {
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const callbackUrl = searchParams.get("callbackUrl") || "/crm/dashboard";

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post<LoginResponse>("/auth/login", {
                email: data.email,
                password: data.password,
            });

            auth.setSession(
                response.access_token,
                response.refresh_token,
                response.user
            );

            // Force hard refresh to ensure middleware and cookies are in sync
            window.location.href = callbackUrl;
        } catch (_err: unknown) {
            setError("Invalid credentials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const rightPanelFeatures = (
        <>
            <FeatureCard
                icon={<BarChart3 className="w-5 h-5" />}
                title="Global Trade Analytics"
                description="Real-time insights and visualization of your global shipping routes and logistics performance."
            />
            <FeatureCard
                icon={<ShieldAlert className="w-5 h-5" />}
                title="Multi-Tenant CRM Security"
                description="Enterprise-grade security architecture with granular role-based access control and encryption."
            />
            <FeatureCard
                icon={<Users2 className="w-5 h-5" />}
                title="Sales & IT Team Collaboration"
                description="Unified platform for cross-department coordination and streamlined communication workflows."
            />
        </>
    );

    return (
        <AuthLayout
            subtitle="Enterprise Trade Intelligence Portal"
            rightPanelContent={rightPanelFeatures}
        >
            {/* Heading block */}
            <div className="mb-8">
                <h1 className="text-5xl font-bold text-black leading-tight tracking-tight">
                    Welcome Back
                </h1>
                <p className="text-base text-black/70 mt-3 font-medium">
                    Sign in to access your trade intelligence dashboard.
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2.5 animate-fadeIn">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
                <InputField
                    label="Email Address"
                    placeholder="name@company.com"
                    type="email"
                    error={errors.email?.message}
                    {...register("email")}
                />

                <InputField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register("password")}
                    rightAction={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-blue-700 transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    }
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-black cursor-pointer group select-none text-sm font-medium">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            className="w-4 h-4 rounded border-gray-400 text-blue-700 focus:ring-blue-700 cursor-pointer transition-all"
                            {...register("rememberMe")}
                        />
                        <span className="group-hover:text-black/70 transition-colors">Keep me signed in</span>
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-blue-700 hover:text-blue-900 font-semibold transition-colors hover:underline underline-offset-4 text-sm"
                    >
                        Forgot password?
                    </Link>
                </div>

                <GradientButton type="submit" isLoading={isLoading}>
                    Sign In to GTD Service
                </GradientButton>

                <p className="text-[11px] font-semibold text-black/40 uppercase tracking-widest text-center pt-2">
                    For authorized trade partners only.
                </p>
            </form>
        </AuthLayout>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-xs">Initializing Enterprise Security...</div>
            </div>
        }>
            <SignInContent />
        </Suspense>
    );
}
