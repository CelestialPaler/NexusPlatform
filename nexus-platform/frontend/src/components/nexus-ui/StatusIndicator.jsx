import React from 'react';
import { cn } from '../../lib/utils';

const VARIANT_STYLES = {
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

const DOT_COLORS = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-gray-500",
};

export function StatusIndicator({ status = "neutral", label, pulse = false, className }) {
    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            VARIANT_STYLES[status] || VARIANT_STYLES.neutral,
            className
        )}>
            <span className={cn(
                "w-2 h-2 mr-1.5 rounded-full",
                DOT_COLORS[status] || DOT_COLORS.neutral,
                pulse && "animate-pulse"
            )}></span>
            {label}
        </span>
    );
}

export function StatusDot({ status = "neutral", pulse = false, className, title }) {
    return (
        <div 
            className={cn("flex items-center", className)}
            title={title || status}
        >
            <span className={cn(
                "block w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-900",
                DOT_COLORS[status] || DOT_COLORS.neutral,
                pulse && "animate-pulse"
            )} />
        </div>
    );
}

export default StatusIndicator;
