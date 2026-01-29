import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AccordionItem = ({ title, children, isOpen, onToggle }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
            <button
                className="flex items-center justify-between w-full py-4 text-left font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
                onClick={onToggle}
            >
                {title}
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div 
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-96 opacity-100 mb-4" : "max-h-0 opacity-0"
                )}
            >
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Accordion = ({ items, allowMultiple = false, className }) => {
    // items: [{ title, content }]
    const [openIndexes, setOpenIndexes] = useState([0]);

    const handleToggle = (index) => {
        if (allowMultiple) {
            setOpenIndexes(prev => 
                prev.includes(index) 
                ? prev.filter(i => i !== index)
                : [...prev, index]
            );
        } else {
            setOpenIndexes(prev => prev.includes(index) ? [] : [index]);
        }
    };

    return (
        <div className={cn("w-full border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 px-4", className)}>
            {items.map((item, index) => (
                <AccordionItem 
                    key={index}
                    title={item.title}
                    isOpen={openIndexes.includes(index)}
                    onToggle={() => handleToggle(index)}
                >
                    {item.content}
                </AccordionItem>
            ))}
        </div>
    );
};

export default Accordion;
