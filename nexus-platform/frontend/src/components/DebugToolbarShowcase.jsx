import React, { useState } from 'react';
import { Layout, BarChart2, Settings, FileText, Play, RefreshCw, Power } from 'lucide-react';
import { ToolToolbar, Button, Switch, StatusIndicator, Badge } from './nexus-ui';

const DebugToolbarShowcase = () => {
    const [activeTab, setActiveTab] = useState('monitor');
    const [isRunning, setIsRunning] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            <ToolToolbar
                icon={
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <Layout className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                }
                title="Toolbar Showcase"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                    { id: 'monitor', label: 'Monitor', icon: <BarChart2 /> },
                    { id: 'config', label: 'Configuration', icon: <Settings /> },
                    { id: 'logs', label: 'Logs', icon: <FileText /> }
                ]}
            >
                {/* Right-side Controls Showcase */}
                <div className="flex items-center gap-4 border-l border-gray-200 dark:border-gray-700 pl-4 ml-2">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">STATUS</span>
                        <StatusIndicator status={isRunning ? "success" : "neutral"} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {isRunning ? "Running" : "Idle"}
                        </span>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Auto-Refresh</span>
                        <Switch 
                            checked={autoRefresh} 
                            onChange={setAutoRefresh} 
                            size="sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            icon={RefreshCw}
                            onClick={() => alert("Refresh clicked")}
                            title="Refresh Data"
                        />
                        <Button 
                            variant={isRunning ? "danger" : "primary"} 
                            size="sm" 
                            icon={isRunning ? Power : Play}
                            onClick={() => setIsRunning(!isRunning)}
                        >
                            {isRunning ? "Stop" : "Start"}
                        </Button>
                    </div>
                    
                    {/* Badge */}
                    <Badge variant="warning">BETA</Badge>
                </div>
            </ToolToolbar>

            {/* Content Preview */}
            <div className="flex-1 overflow-hidden p-4">
                <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <Layout size={48} className="mb-4 opacity-20" />
                    <h2 className="text-xl font-medium mb-2">Tab: {activeTab.toUpperCase()}</h2>
                    <p>Use the toolbar above to switch tabs or interact with controls.</p>
                </div>
            </div>
        </div>
    );
};

export default DebugToolbarShowcase;
