"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const urlToken = searchParams.get("token") || "";

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: urlToken,
        }
    });

    useEffect(() => {
        if (urlToken) {
            setValue("token", urlToken);
        }
    }, [urlToken, setValue]);

    const onSubmit = async (data: ResetPasswordFormValues) => {
        setIsLoading(true);
        setError(null);
        try {
            await api.post("/auth/reset-password", {
                token: data.token,
                new_password: data.password,
            });
            setIsSubmitted(true);

            // Auto-redirect to signin after 3 seconds
            setTimeout(() => {
                router.push("/signin");
            }, 3000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to reset password. The token may be expired or invalid.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50">
            <div className="w-full max-w-md space-y-8 animate-fadeInUp">
                <div className="text-center mb-8 space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Lock className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Secure Reset</h2>
                    <p className="text-slate-500 font-medium">Set a strong password to protect your trade account.</p>
                </div>

                <Card className="border border-slate-200 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
                    <CardContent className="pt-8 px-8 pb-8">
                        {!isSubmitted ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {error && (
                                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3 animate-fadeIn">
                                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Token Field (Hidden if from URL, visible otherwise for manual entry) */}
                                    {!urlToken ? (
                                        <div className="space-y-1.5">
                                            <Input
                                                label="Reset Token"
                                                placeholder="Paste your token from email..."
                                                leftIcon={<ShieldAlert className="w-4 h-4" />}
                                                error={errors.token?.message}
                                                {...register("token")}
                                            />
                                            <p className="text-[10px] text-slate-400 font-medium px-1">
                                                Copy the token sent to your corporate email.
                                            </p>
                                        </div>
                                    ) : (
                                        <input type="hidden" {...register("token")} />
                                    )}

                                    <Input
                                        label="New Password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        leftIcon={<Lock className="w-4 h-4" />}
                                        rightAction={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
                                        error={errors.password?.message}
                                        {...register("password")}
                                    />

                                    <Input
                                        label="Confirm New Password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        leftIcon={<Lock className="w-4 h-4" />}
                                        error={errors.confirmPassword?.message}
                                        {...register("confirmPassword")}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full text-sm font-bold h-12 rounded-xl"
                                    isLoading={isLoading}
                                >
                                    Reset Password <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6 py-4 animate-fadeIn">
                                <div className="flex justify-center">
                                    <CheckCircle2 className="w-16 h-16 text-success animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-text-primary">Password updated</h3>
                                    <p className="text-sm text-text-muted">
                                        Your password has been successfully changed.
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <p className="text-xs text-text-muted mb-4">Redirecting to login...</p>
                                    <Link href="/signin">
                                        <Button variant="outline" className="w-full">
                                            Sign In Now
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-text-muted">
                    Remembered your password? <Link href="/signin" className="font-semibold text-primary hover:underline">Sign In</Link>
                </p>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-surface-secondary/30">
                <div className="animate-pulse text-primary font-medium">Loading session...</div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
