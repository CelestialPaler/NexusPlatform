import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef(({ className, label, checked, onChange, disabled, ...props }, ref) => {
    return (
        <label className={cn(
            "flex items-center space-x-2 cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onChange && onChange(e.target.checked)}
                    disabled={disabled}
                    {...props}
                />
                <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    checked
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-blue-500"
                )}>
                    {checked && <Check size={14} strokeWidth={3} />}
                </div>
            </div>
            {label && (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    {label}
                </span>
            )}
        </label>
    );
});

Checkbox.displayName = "Checkbox";
export default Checkbox;
