import React from 'react';
import { cn } from '../../lib/utils';

const Slider = React.forwardRef(({ className, min = 0, max = 100, step = 1, value, onChange, label, unit, ...props }, ref) => {
    return (
        <div className={cn("w-full", className)}>
            {(label || unit) && (
                <div className="flex justify-between mb-2">
                    {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
                    {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{value} {unit}</span>}
                </div>
            )}
            <input
                type="range"
                className={cn(
                    "w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer",
                    "accent-blue-600 dark:accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                )}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange && onChange(Number(e.target.value))}
                ref={ref}
                {...props}
            />
        </div>
    );
});

Slider.displayName = "Slider";
export default Slider;
