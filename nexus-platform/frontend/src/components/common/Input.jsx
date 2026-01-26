import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Input = React.forwardRef(({ label, error, className, wrapperClassName, helpText, icon: Icon, ...props }, ref) => {
    return (
        <div className={cn("w-full", wrapperClassName)}>
            {label && (
                <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors",
                        Icon ? "pl-10 pr-3 py-2" : "px-3 py-2",
                        error ? "border-red-500 focus:ring-red-500/50 focus:border-red-500" : "",
                        "disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
