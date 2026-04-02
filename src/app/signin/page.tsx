"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

            const loginData = response.data;
            auth.setSession(
                loginData.access_token,
                loginData.refresh_token,
                loginData.user
            );

            // Force hard refresh to ensure middleware and cookies are in sync
            window.location.href = callbackUrl;
        } catch {
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

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                        >
                            {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                        </button>
                    }
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#000', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        <input
                            type="checkbox"
                            id="rememberMe"
                            style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                            {...register("rememberMe")}
                        />
                        Keep me signed in
                    </label>
                    <Link
                        href="/forgot-password"
                        style={{ color: '#1d4ed8', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
                    >
                        Forgot password?
                    </Link>
                </div>

                <div style={{ marginTop: '8px' }}>
                    <GradientButton type="submit" isLoading={isLoading}>
                        Sign In to Smart Chatbot
                    </GradientButton>
                </div>

                <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', margin: 0 }}>
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
