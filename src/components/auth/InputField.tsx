"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    rightAction?: React.ReactNode;
}

export default function InputField({ label, error, rightAction, className, ...props }: InputFieldProps) {
    const id = React.useId();

    return (
        <div className="flex flex-col gap-2 w-full">
            <label
                htmlFor={id}
                className="text-xs font-bold uppercase tracking-wider text-black"
            >
                {label}
            </label>
            <div className="relative flex items-center">
                <input
                    id={id}
                    className={cn(
                        "w-full h-13 px-4 py-3.5 rounded-xl border-2 border-gray-300 bg-white text-black text-base font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 shadow-sm placeholder:text-gray-300",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        rightAction && "pr-12",
                        className
                    )}
                    {...props}
                />
                {rightAction && (
                    <div className="absolute right-3">
                        {rightAction}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs font-bold text-red-600 animate-fadeIn">{error}</p>
            )}
        </div>
    );
}
