import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelClassName?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightAction?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, labelClassName, error, helperText, leftIcon, rightAction, ...props }, ref) => {
        const id = React.useId();

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className={cn(
                            "text-sm font-semibold text-text-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                            labelClassName
                        )}
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {leftIcon && (
                        <div className="absolute left-3 text-text-muted transition-colors pointer-events-none flex items-center justify-center">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-11 w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                            leftIcon && "pl-10",
                            rightAction && "pr-10",
                            error && "border-danger focus-visible:ring-danger",
                            className
                        )}
                        ref={ref}
                        id={id}
                        {...props}
                    />
                    {rightAction && (
                        <div className="absolute right-3 flex items-center justify-center">
                            {rightAction}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-xs font-medium text-danger animate-fadeIn">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-text-muted">{helperText}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
