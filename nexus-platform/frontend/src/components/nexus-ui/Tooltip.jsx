import React from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ content, children, side = "top" }) => {
    // Defines position classes based on side
    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
        top: "top-full left-1/2 -translate-x-1/2 -mt-1 border-t-gray-900",
        bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-gray-900",
        left: "left-full top-1/2 -translate-y-1/2 -ml-1 border-l-gray-900",
        right: "right-full top-1/2 -translate-y-1/2 -mr-1 border-r-gray-900",
    };

    return (
        <div className="group relative inline-flex items-center">
            {children}
            {/* Tooltip Content */}
            <div className={`absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 ${positionClasses[side]} w-max max-w-xs`}>
                <div className="bg-gray-900 text-gray-100 text-xs rounded py-1 px-2 shadow-xl border border-gray-700">
                    {content}
                </div>
                {/* Arrow */}
                <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[side]}`} />
            </div>
        </div>
    );
};

export const InfoParams = ({ text }) => (
    <Tooltip content={text}>
        <HelpCircle size={14} className="text-gray-500 hover:text-gray-300 cursor-help ml-1" />
    </Tooltip>
);

export default Tooltip;
