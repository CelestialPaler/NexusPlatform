import React from 'react';
import { cn } from '../../lib/utils';

const ProgressBar = React.forwardRef(({ className, value = 0, max = 100, label, showValue, color = "blue", size = "md", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizes = {
        sm: "h-1.5",
        md: "h-2.5",
        lg: "h-4"
    };

    const colors = {
        blue: "bg-blue-600 dark:bg-blue-500",
        green: "bg-green-600 dark:bg-green-500",
        red: "bg-red-600 dark:bg-red-500",
        yellow: "bg-yellow-500 dark:bg-yellow-400",
        purple: "bg-purple-600 dark:bg-purple-500",
    };

    return (
        <div className={cn("w-full", className)}>
            {(label || showValue) && (
                <div className="flex justify-between mb-1">
                    {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
                    {showValue && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{percentage.toFixed(0)}%</span>}
                </div>
            )}
            <div className={cn("w-full bg-gray-200 dark:bg-gray-700 rounded-full dark:bg-gray-700", sizes[size])}>
                <div
                    className={cn(colors[color], sizes[size], "rounded-full transition-all duration-500 ease-out")}
                    style={{ width: `${percentage}%` }}
                    ref={ref}
                    {...props}
                ></div>
            </div>
        </div>
    );
});

ProgressBar.displayName = "ProgressBar";
export default ProgressBar;
