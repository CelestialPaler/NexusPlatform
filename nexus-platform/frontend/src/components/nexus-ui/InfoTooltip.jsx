import React from 'react';
import { HelpCircle } from 'lucide-react';
import Tooltip from './Tooltip';
import { cn } from '../../lib/utils';

/**
 * A standard help icon that displays a tooltip on hover.
 * 
 * @param {string} content - The text to display in the tooltip
 * @param {number} size - The size of the icon (default: 14)
 * @param {string} className - Additional CSS classes
 */
const InfoTooltip = ({ content, size = 14, className }) => {
    return (
        <Tooltip content={content}>
            <HelpCircle 
                size={size} 
                className={cn(
                    "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help transition-colors", 
                    className
                )} 
            />
        </Tooltip>
    );
};

export default InfoTooltip;
