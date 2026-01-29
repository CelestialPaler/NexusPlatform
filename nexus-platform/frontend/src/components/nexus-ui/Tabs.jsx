import React, { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * A simple, standard Tabs component.
 * 
 * @param {Array<{label: string, value: string, content: ReactNode}>} items - Tab items
 * @param {string} defaultValue - Key of the default active tab
 * @param {function} onValueChange - Callback when tab changes
 */
const Tabs = ({ items, defaultValue, onValueChange, className }) => {
    const [activeTab, setActiveTab] = useState(defaultValue || (items[0] ? items[0].value : ''));

    const handleTabClick = (value) => {
        setActiveTab(value);
        if (onValueChange) onValueChange(value);
    };

    const activeContent = items.find(item => item.value === activeTab)?.content;

    return (
        <div className={cn("w-full", className)}>
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                {items.map((item) => (
                    <button
                        key={item.value}
                        onClick={() => handleTabClick(item.value)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors border-b-2 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                            activeTab === item.value 
                                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div className="mt-2 text-gray-900 dark:text-gray-100">
                {activeContent}
            </div>
        </div>
    );
};

export default Tabs;
