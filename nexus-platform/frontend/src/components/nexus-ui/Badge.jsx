import React from 'react';
import { cn } from '../../lib/utils';

/**
 * A standard Badge/Tag component for labels and metadata.
 * 
 * @param {string} children - The text content
 * @param {string} variant - 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'
 * @param {string} size - 'sm' | 'md'
 */
const Badge = ({ children, variant = 'default', size = 'md', className, ...props }) => {
    
    const variants = {
        default: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-transparent",
        secondary: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-transparent",
        outline: "bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-transparent",
        success: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-transparent",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-transparent",
    };

    const sizes = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2.5 py-0.5",
    };

    return (
        <div className={cn(
            "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variants[variant],
            sizes[size],
            className
        )} {...props}>
            {children}
        </div>
    );
};

export default Badge;
