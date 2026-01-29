import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const TextArea = React.forwardRef(({ label, error, className, helpText, ...props }, ref) => {
    return (
        <div className="w-full h-full flex flex-col">
            {label && (
                <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">
                    {label}
                </label>
            )}
            <textarea
                ref={ref}
                className={cn(
                    "w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors p-3 resize-none",
                    error ? "border-red-500 focus:ring-red-500/50 focus:border-red-500" : "",
                    "disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed",
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
    );
});

TextArea.displayName = 'TextArea';
export default TextArea;
