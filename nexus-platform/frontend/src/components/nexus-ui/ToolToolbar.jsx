import React from 'react';
import PropTypes from 'prop-types';

const ToolToolbar = ({ 
    icon, 
    title, 
    tabs = [], 
    activeTab, 
    onTabChange, 
    children 
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-2 shadow-sm border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 flex-shrink-0 min-h-[4rem] justify-center">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-4">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-2 select-none">
                        {icon && <div className="flex items-center justify-center">{icon}</div>}
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">{title}</h1>
                    </div>

                    {/* Separator (Only if tabs are present) */}
                    {tabs.length > 0 && (
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                    )}

                    {/* Tabs */}
                    {tabs.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => (
                                <button 
                                    key={tab.id}
                                    onClick={() => onTabChange && onTabChange(tab.id)} 
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === tab.id 
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {tab.icon && React.cloneElement(tab.icon, { size: 16 })}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side Actions/Controls */}
                <div className="flex items-center gap-2 pr-36">
                    {children}
                </div>
            </div>
        </div>
    );
};

ToolToolbar.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.string.isRequired,
    tabs: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        icon: PropTypes.node
    })),
    activeTab: PropTypes.string,
    onTabChange: PropTypes.func,
    children: PropTypes.node
};

export default ToolToolbar;
