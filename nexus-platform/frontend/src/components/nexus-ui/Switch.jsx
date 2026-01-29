import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Switch = React.forwardRef(({ label, error, className, wrapperClassName, helpText, checked, onChange, ...props }, ref) => {
    return (
        <div className={cn("w-full flex items-center justify-between", wrapperClassName)}>
             <div className="flex flex-col mr-4">
                {label && (
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                    </label>
                )}
                {helpText && <p className="text-xs text-gray-500 mt-0.5">{helpText}</p>}
                {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
            </div>

            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange && onChange(!checked)}
                ref={ref}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                    checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    className
                )}
                {...props}
            >
                <span className="sr-only">{label}</span>
                <span
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    );
});

Switch.displayName = 'Switch';
export default Switch;
