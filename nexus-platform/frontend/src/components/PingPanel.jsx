import React, { useState, useEffect } from 'react';
import { 
    Play, Square, Plus, Trash2, Activity, Settings, 
    BarChart2 
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer 
} from 'recharts';

import { Input, Button, LogConsole } from './nexus-ui';
import UniversalDriver from '../utils/UniversalDriver';

const TOOL_ID = 'nexus.network.ping';

// --- Sub-components ---

const StatsCard = ({ label, value, unit, color = "text-blue-500" }) => (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 shadow-sm flex flex-col items-center justify-center min-w-[100px]">
        <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            <span className="text-xs text-gray-500">{unit}</span>
        </div>
    </div>
);

// --- Single Instance View ---
const PingInstanceView = ({ instance, onUpdate, active }) => {
    const [logs, setLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ min: 0, max: 0, avg: 0, current: 0, sent: 0, lost: 0 });

    useEffect(() => {
        // Subscribe to events using UniversalDriver
        // Events are: nexus.network.ping:ping-log
        // Note: PingTool still emits 'ping-log' derived from callback('ping-log', ...)
        const unsubLog = UniversalDriver.on(TOOL_ID, 'ping-log', (payload) => {
            if (payload.id === instance.id) {
                setLogs(prev => [...prev, payload.data].slice(-500));
            }
        });

        const unsubData = UniversalDriver.on(TOOL_ID, 'ping-data', (payload) => {
            if (payload.id === instance.id) {
                const point = payload.data;
                const lat = point.latency || 0;
                
                setChartData(prev => {
                    const newData = [...prev, { time: new Date().toLocaleTimeString(), latency: lat }];
                    return newData.slice(-60); 
                });

                // Update Stats
                setStats(s => {
                    const newSent = s.sent + 1;
                    const newLost = point.error ? s.lost + 1 : s.lost;
                    
                    const newMin = (s.min === 0 || (lat < s.min && !point.error)) ? lat : s.min;
                    const newMax = lat > s.max ? lat : s.max;
                    
                    return {
                        ...s,
                        current: lat,
                        sent: newSent,
                        lost: newLost,
                        min: newMin,
                        max: newMax,
                        avg: s.sent === 0 ? lat : Math.round((s.avg * s.sent + lat) / (s.sent + 1)) 
                    };
                });
            }
        });

        const unsubDone = UniversalDriver.on(TOOL_ID, 'ping-done', (payload) => {
            if (payload.id === instance.id) {
                onUpdate(instance.id, { status: 'idle' });
            }
        });

        return () => {
            unsubLog();
            unsubData();
            unsubDone();
        };
    }, [instance.id, onUpdate]);

    const handleStop = async () => {
        await UniversalDriver.invoke(TOOL_ID, 'stop', { instance_id: instance.id });
        onUpdate(instance.id, { status: 'idle' });
    };

    if (!active) return null;

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="col-span-2 md:col-span-2 flex items-center space-x-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700">
                    <Activity className={instance.status === 'running' ? "text-green-500 animate-pulse" : "text-gray-400"} size={32} />
                    <div>
                        <div className="text-sm text-gray-500">Target Host</div>
                        <div className="text-xl font-bold font-mono">{instance.config.host}</div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                            <span className={`w-2 h-2 rounded-full mr-2 ${instance.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            {instance.status.toUpperCase()}
                        </div>
                    </div>
                </div>
                <StatsCard label="Current" value={stats.current} unit="ms" />
                <StatsCard label="Average" value={stats.avg} unit="ms" />
                <StatsCard label="Min/Max" value={`${stats.min}/${stats.max}`} unit="ms" />
                <StatsCard label="Packet Loss" value={stats.lost} unit="pkt" color="text-red-500" />
            </div>

            {/* Main Content: Chart + Log */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                {/* Chart Area */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-500 flex items-center">
                            <BarChart2 size={16} className="mr-2" />
                            Latency History
                        </h3>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 'auto']} stroke="#9ca3af" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                />
                                <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLat)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Log Area */}
                <div className="lg:col-span-1 h-full min-h-0 flex flex-col">
                     <LogConsole logs={logs} height="h-full" className="flex-1" />
                </div>
            </div>

            {/* Helper Actions */}
            {instance.status === 'running' && (
                <div className="flex justify-end">
                    <Button variant="danger" onClick={handleStop} icon={Square}>Stop Process</Button>
                </div>
            )}
        </div>
    );
};

// --- Main Panel ---
export default function PingPanel() {
    const [instances, setInstances] = useState([]);
    const [activeInstanceId, setActiveInstanceId] = useState(null);
    const [target, setTarget] = useState('8.8.8.8');

    // Create a default instance
    const handleStart = async () => {
        if (!target) return;
        
        const newId = `ping-${Date.now()}`;
        const newInstance = {
            id: newId,
            status: 'running',
            config: { host: target, id: newId } // Pass ID in config for backend
        };

        setInstances(prev => [...prev, newInstance]);
        setActiveInstanceId(newId);

        try {
            // Call via UniversalDriver
            const res = await UniversalDriver.invoke(TOOL_ID, 'run', newInstance.config);
            if (res.status === 'error') {
                 console.error("Failed to start ping:", res.message);
                 // Handle error updates
            }
        } catch (e) {
            console.error("Driver error:", e);
        }
    };

    const handleUpdateInstance = (id, updates) => {
        setInstances(prev => prev.map(inst => inst.id === id ? { ...inst, ...updates } : inst));
    };

    const handleRemove = async (id, e) => {
        e.stopPropagation();
        // Ensure stopped
        await UniversalDriver.invoke(TOOL_ID, 'stop', { instance_id: id });
        setInstances(prev => {
            const next = prev.filter(i => i.id !== id);
            if (activeInstanceId === id) setActiveInstanceId(next.length > 0 ? next[0].id : null);
            return next;
        });
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900/50">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-end space-x-4 shadow-sm">
                <Input 
                    label="Target Host" 
                    placeholder="IP or Domain" 
                    value={target} 
                    onChange={e => setTarget(e.target.value)}
                    wrapperClassName="w-64"
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                />
                
                <Button 
                    variant="primary" 
                    icon={Play} 
                    onClick={handleStart}
                    className="mb-[1px]" // Alignment hack
                >
                    Start Ping
                </Button>
                
                <div className="flex-1" />
                
                <div className="flex items-center text-sm text-gray-500">
                    <Settings size={16} className="mr-1" />
                    <span>Advanced Options</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col overflow-y-auto">
                    {instances.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm mt-10">
                            No active sessions
                        </div>
                    )}
                    {instances.map(inst => (
                        <div 
                            key={inst.id}
                            onClick={() => setActiveInstanceId(inst.id)}
                            className={`p-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group ${activeInstanceId === inst.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="font-mono font-bold text-sm truncate">{inst.config.host}</div>
                                <button 
                                    onClick={(e) => handleRemove(inst.id, e)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                {inst.status === 'running' ? (
                                    <span className="flex items-center text-green-500">
                                        <Activity size={12} className="mr-1 animate-pulse" /> Running
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Square size={12} className="mr-1" /> Stopped
                                    </span>
                                )}
                                <span className="mx-2">|</span>
                                <span className="font-mono">{inst.id.slice(-6)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main View */}
                <div className="flex-1 p-4 overflow-hidden">
                    {activeInstanceId ? (
                        <PingInstanceView 
                            key={activeInstanceId} 
                            instance={instances.find(i => i.id === activeInstanceId)} 
                            onUpdate={handleUpdateInstance}
                            active={true}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Activity size={48} className="mb-4 opacity-50" />
                            <p>Select or create a ping session</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
