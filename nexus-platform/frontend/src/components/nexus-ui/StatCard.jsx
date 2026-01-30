import React from 'react';
import { cn } from '../../lib/utils';
import InfoTooltip from './InfoTooltip';

/**
 * A standard statistical card component for dashboards.
 * 
 * @param {string} title - The label displayed at the top (e.g., "CURRENT LATENCY")
 * @param {script|node} value - The main value (e.g., "45")
 * @param {string} unit - The unit displayed next to the value (e.g., "ms")
 * @param {string} color - The color theme ('blue', 'red', 'green', 'yellow', 'neutral')
 * @param {string} helpText - Optional tooltip text to explain the metric
 * @param {string} className - Additional CSS classes
 */
const StatCard = ({ title, value, unit, color = 'blue', helpText, className }) => {

    const colors = {
        blue: "text-blue-600 dark:text-blue-400",
        red: "text-red-500 dark:text-red-400",
        green: "text-green-600 dark:text-green-400",
        yellow: "text-yellow-600 dark:text-yellow-400",
        neutral: "text-gray-900 dark:text-white"
    };

    return (
        <div className={cn(
            "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center shadow-sm min-w-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
            className
        )}>
            <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                    {title}
                </span>
                {helpText && <InfoTooltip content={helpText} size={12} />}
            </div>

            <div className="flex items-baseline gap-1">
                <span className={cn("text-3xl font-bold font-mono", colors[color] || colors.neutral)}>
                    {value}
                </span>
                {unit && (
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-1">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
};

export default StatCard;
