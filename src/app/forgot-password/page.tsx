"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, ChevronLeft, BarChart3, ShieldAlert, Users2 } from "lucide-react";

import AuthLayout from "@/components/auth/AuthLayout";
import InputField from "@/components/auth/InputField";
import GradientButton from "@/components/auth/GradientButton";
import FeatureCard from "@/components/auth/FeatureCard";
import { api } from "@/lib/api";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordValues) => {
        setIsLoading(true);
        setError(null);
        try {
            await api.post("/auth/forgot-password", { email: data.email });
            setIsSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to send reset link. Please try again.";
            setError(message);
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
            <div className="mb-8">
                <Link
                    href="/signin"
                    className="inline-flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors group mb-6"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recover Access</h1>
                    <p className="text-slate-500 font-medium">Reset your secure Trade CRM credentials.</p>
                </div>
            </div>

            {isSubmitted ? (
                <div className="space-y-6 animate-fadeIn">
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Check your email</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                We&apos;ve sent a secure password reset link to your corporate email address.
                            </p>
                        </div>
                    </div>
                    <Link href="/signin">
                        <GradientButton className="mt-4">
                            Return to Sign In
                        </GradientButton>
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-fadeIn">
                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <InputField
                            label="Corporate Email Address"
                            placeholder="name@company.com"
                            type="email"
                            error={errors.email?.message}
                            {...register("email")}
                        />

                        <GradientButton type="submit" isLoading={isLoading}>
                            Send Reset Link
                        </GradientButton>

                        <div className="text-center pt-4">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                                For security reasons, if an account exists for this email,<br />
                                you will receive reset instructions shortly.
                            </p>
                        </div>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
}
