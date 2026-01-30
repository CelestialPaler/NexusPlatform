import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/20",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-900",
    solidDanger: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/20",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-900/20",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
};

const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
    icon: "p-2",
};

const Button = ({ children, variant = "primary", size = "md", className, disabled, loading, icon: Icon, iconSize = 18, ...props }) => {
    return (
        <button
            disabled={disabled || loading}
            className={cn(
                "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : Icon ? (
                <Icon size={iconSize} className={children ? "mr-2" : ""} />
            ) : null}
            {children}
        </button>
    );
};

export default Button;
