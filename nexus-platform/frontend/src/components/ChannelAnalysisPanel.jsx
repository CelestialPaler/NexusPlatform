import React, { useState } from 'react';
import { Activity, BarChart2, Settings } from 'lucide-react';
import { ToolToolbar } from './nexus-ui';

const ChannelAnalysisPanel = ({ t }) => {
    const [activeTab, setActiveTab] = useState('monitor');

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            <ToolToolbar
                icon={
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Activity className="text-purple-600 dark:text-purple-400" size={20} />
                    </div>
                }
                title="Channel Analysis"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                    { id: 'monitor', label: 'Monitor', icon: <BarChart2 /> },
                    { id: 'settings', label: 'Configuration', icon: <Settings /> }
                ]}
            />

            <div className="flex-1 overflow-hidden p-4">
                <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    {activeTab === 'monitor' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto p-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-6">
                                <Activity className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Channel Analysis Tool Ready
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                This tool is currently under construction. Features will be migrated from the simulation experiment soon.
                            </p>
                        </div>
                    )}
                    
                    {activeTab === 'settings' && (
                        <div className="flex-1 p-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configuration</h3>
                            <p className="text-sm text-gray-500">Settings will be available here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelAnalysisPanel;
