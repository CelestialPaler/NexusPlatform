import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, Square, Plus, Trash2, Activity, Settings, 
    Terminal, BarChart2, Zap, X, Clock, Database 
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import Input from './nexus-ui/Input';
import Button from './nexus-ui/Button';

// --- Sub-components for Clean Code ---

const StatsCard = ({ label, value, unit, color = "text-blue-500" }) => (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 shadow-sm flex flex-col items-center justify-center min-w-[100px]">
        <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            <span className="text-xs text-gray-500">{unit}</span>
        </div>
    </div>
);

const LogTerminal = ({ logs }) => {
    const endRef = useRef(null);
    
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="bg-gray-950 text-gray-300 font-mono text-xs p-3 rounded-lg shadow-inner overflow-auto h-full border border-gray-800">
            {logs.length === 0 && <div className="text-gray-600 italic">Ready to capture...</div>}
            {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap hover:bg-gray-900/50 px-1 border-l-2 border-transparent hover:border-blue-500">
                    <span className="text-gray-600 select-none mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
};

// --- Single Instance Logic ---
const PingInstanceView = ({ instance, onUpdate, active }) => {
    const [logs, setLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ min: 0, max: 0, avg: 0, current: 0, sent: 0, lost: 0 });

    // Event Listening
    useEffect(() => {
        const handleLog = (e) => {
            if (e.detail.id === instance.id) {
                // Parse log for simple stats if needed, or just append
                const msg = e.detail.data;
                setLogs(prev => [...prev, msg].slice(-200)); // Keep last 200 logs
            }
        };
        const handleData = (e) => {
            if (e.detail.id === instance.id) {
                const point = e.detail.data;
                const lat = point.latency || 0;
                
                setChartData(prev => {
                    const newData = [...prev, { time: point.timestamp, latency: lat }];
                    return newData.slice(-60); // Keep last 60 points (~1 min if 1s interval)
                });

                // Update Stats
                setStats(s => {
                    const newSent = s.sent + 1;
                    const newLost = point.error ? s.lost + 1 : s.lost;
                    const validLatency = point.error ? s.current : lat; // Don't ruin avg with 0/null
                    
                    // Simple running avg approximation or recalc from chartData? 
                    // Let's do simple current/min/max logic
                    const newMin = (s.min === 0 || (lat < s.min && !point.error)) ? lat : s.min;
                    const newMax = lat > s.max ? lat : s.max;
                    
                    return {
                        ...s,
                        current: lat,
                        sent: newSent,
                        lost: newLost,
                        min: newMin,
                        max: newMax,
                        avg: Math.round((s.avg * s.sent + lat) / (s.sent + 1)) // Approx
                    };
                });
            }
        };
        const handleDone = (e) => {
            if (e.detail.id === instance.id) onUpdate(instance.id, { status: 'idle' });
        };
        
        window.addEventListener('ping-log', handleLog);
        window.addEventListener('ping-data', handleData);
        window.addEventListener('ping-done', handleDone);

        return () => {
            window.removeEventListener('ping-log', handleLog);
            window.removeEventListener('ping-data', handleData);
            window.removeEventListener('ping-done', handleDone);
        };
    }, [instance.id]);

    const handleRun = async () => {
        // Clear previous run data
        setLogs([]);
        setChartData([]);
        setStats({ min: 0, max: 0, avg: 0, current: 0, sent: 0, lost: 0 });

        if (window.pywebview) {
            const res = await window.pywebview.api.run_ping({ ...instance.config, id: instance.id });
            if (res.status === 'started') {
                onUpdate(instance.id, { status: 'running' });
            }
        }
    };

    const handleStop = async () => {
        if (window.pywebview) {
            await window.pywebview.api.stop_ping(instance.id);
        }
        onUpdate(instance.id, { status: 'idle' });
    };

    const isRunning = instance.status === 'running';

    return (
        <div className={`flex-1 flex flex-col gap-4 p-4 h-full overflow-hidden ${active ? '' : 'hidden'}`}>
            
            {/* 1. Configuration Bar & Stats Hybrid */}
            <div className="flex gap-4 items-stretch h-24 shrink-0">
                {/* Config Form */}
                <div className="flex-[2] bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 shadow-sm flex items-end gap-3">
                     <div className="flex-1">
                        <Input 
                            label="Target Host" 
                            value={instance.config.host} 
                            onChange={e => onUpdate(instance.id, { config: { ...instance.config, host: e.target.value }})}
                            disabled={isRunning}
                            placeholder="e.g. 8.8.8.8"
                            icon={Database}
                        />
                     </div>
                     <div className="w-24">
                        <Input 
                            label="Interval" 
                            type="number"
                            value={instance.config.interval || 1} 
                            onChange={e => onUpdate(instance.id, { config: { ...instance.config, interval: parseFloat(e.target.value) }})}
                            disabled={isRunning}
                            icon={Clock}
                        />
                     </div>
                     <div className="w-24">
                        <Input 
                            label="Size" 
                            type="number"
                            value={instance.config.size || 32} 
                            onChange={e => onUpdate(instance.id, { config: { ...instance.config, size: parseInt(e.target.value) }})}
                            disabled={isRunning}
                        />
                     </div>
                     <div className="pb-[2px]">
                        {!isRunning ? (
                            <Button onClick={handleRun} variant="primary" icon={Play} className="h-[42px] px-6">Run</Button>
                        ) : (
                            <Button onClick={handleStop} variant="danger" icon={Square} className="h-[42px] px-6">Stop</Button>
                        )}
                     </div>
                </div>

                {/* Live Stats */}
                <div className="flex-1 flex gap-2">
                    <StatsCard label="Current" value={stats.current} unit="ms" color="text-green-500" />
                    <StatsCard label="Average" value={stats.avg} unit="ms" />
                    <StatsCard label="Loss" value={stats.sent > 0 ? ((stats.lost/stats.sent)*100).toFixed(0) : 0} unit="%" color="text-red-500" />
                </div>
            </div>

            {/* 2. Main Chart Area */}
            <div className="flex-[3] bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm flex flex-col min-h-0 relative group">
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-gray-100 dark:bg-gray-700 text-xs px-2 py-1 rounded">Real-time Latency (ms)</span>
                </div>
                <div className="flex-1 w-full h-full p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 'auto']} hide />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#60a5fa' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="latency" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorLatency)" 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Log Output */}
            <div className="h-48 shrink-0 flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                        <Terminal size={12} /> Execution Log
                    </h3>
                    <button className="text-xs text-blue-500 hover:text-blue-400" onClick={() => setLogs([])}>Clear</button>
                </div>
                <LogTerminal logs={logs} />
            </div>

        </div>
    );
};

// --- Main Layout ---

const PingPanel = ({ t }) => {
    // Session State
    const [instances, setInstances] = useState([
        { id: 'default-1', status: 'idle', config: { host: '8.8.8.8', interval: 1, size: 32 } }
    ]);
    const [activeTabId, setActiveTabId] = useState('default-1');

    // Instance Management
    const addInstance = () => {
        const newId = `ping-${Date.now()}`;
        setInstances([...instances, { id: newId, status: 'idle', config: { host: '8.8.8.8', interval: 1 } }]);
        setActiveTabId(newId);
    };

    const removeInstance = (id, e) => {
        e.stopPropagation();
        if (instances.length === 1) return; // Don't delete last one
        const newD = instances.filter(i => i.id !== id);
        setInstances(newD);
        if (activeTabId === id) setActiveTabId(newD[0].id);
    };

    const updateInstance = (id, data) => {
        setInstances(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Header / Title Bar */}
            <div className="h-14 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center px-4 justify-between shrink-0 z-10 shadow-sm">
                
                {/* Left: Branding & Tabs */}
                <div className="flex items-center gap-6 overflow-hidden flex-1">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 shrink-0">
                        <Activity size={24} strokeWidth={2.5} />
                        <span className="font-bold text-lg tracking-tight">Ping Pilot</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-linear-fade">
                        {instances.map(inst => (
                            <div 
                                key={inst.id}
                                onClick={() => setActiveTabId(inst.id)}
                                className={`
                                    group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border
                                    ${activeTabId === inst.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500'}
                                `}
                            >
                                <span className="w-2 h-2 rounded-full transition-colors" 
                                      style={{ backgroundColor: inst.status === 'running' ? '#10b981' : '#9ca3af' }} />
                                <span className="whitespace-nowrap max-w-[100px] truncate">{inst.config.host}</span>
                                {instances.length > 1 && (
                                    <X size={12} className="opacity-0 group-hover:opacity-100 hover:text-red-500" onClick={(e) => removeInstance(inst.id, e)} />
                                )}
                            </div>
                        ))}
                        <button onClick={addInstance} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Right: Global Actions */}
                <div className="flex items-center gap-2 shrink-0">
                   <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <Settings size={18} />
                   </button>
                </div>
            </div>

            {/* Main Content Body */}
            <div className="flex-1 relative">
                {instances.map(inst => (
                    <PingInstanceView 
                        key={inst.id} 
                        instance={inst} 
                        active={inst.id === activeTabId} 
                        onUpdate={updateInstance}
                    />
                ))}
            </div>
        </div>
    );
};

export default PingPanel;
