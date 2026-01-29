import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, Activity, BarChart2, Zap
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';

import { Input, Button, LogConsole } from './nexus-ui';
import UniversalDriver from '../utils/UniversalDriver';

const TOOL_ID = 'nexus.network.ping';

// --- Sub-components ---

const StatsCard = ({ label, value, unit, color = "text-blue-500" }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
        <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-3xl font-bold font-mono ${color}`}>{value}</span>
            <span className="text-sm text-gray-500">{unit}</span>
        </div>
    </div>
);

// --- Main Panel ---
export default function PingPanel() {
    // Configuration State
    const [target, setTarget] = useState('8.8.8.8');

    // Runtime State
    const [isRunning, setIsRunning] = useState(false);
    const [instanceId, setInstanceId] = useState(null);

    // Data State
    const [logs, setLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ min: 0, max: 0, avg: 0, current: 0, sent: 0, lost: 0 });

    // Refs for cleanup
    const activeIdRef = useRef(null);

    useEffect(() => {
        // Event Subscriptions
        const unsubLog = UniversalDriver.on(TOOL_ID, 'ping-log', (payload) => {
            if (payload.id === activeIdRef.current) {
                setLogs(prev => [...prev, payload.data].slice(-200));
            }
        });

        const unsubData = UniversalDriver.on(TOOL_ID, 'ping-data', (payload) => {
            if (payload.id === activeIdRef.current) {
                const point = payload.data;
                const lat = point.latency || 0;

                setChartData(prev => {
                    const newData = [...prev, { time: new Date().toLocaleTimeString(), latency: lat }];
                    return newData.slice(-100); // Keep last 100 points
                });

                // Update Stats
                setStats(s => {
                    const newSent = s.sent + 1;
                    const newLost = point.error ? s.lost + 1 : s.lost;

                    // Only update min/max if not an error (unless it's the first point)
                    let newMin = s.min;
                    let newMax = s.max;

                    if (!point.error) {
                        newMin = (s.min === 0 || lat < s.min) ? lat : s.min;
                        newMax = lat > s.max ? lat : s.max;
                    }

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
            if (payload.id === activeIdRef.current) {
                setIsRunning(false);
                setLogs(prev => [...prev, "--- Process Finished ---"]);
            }
        });

        return () => {
            unsubLog();
            unsubData();
            unsubDone();
        };
    }, []);

    const handleStart = async () => {
        if (!target) return;
        if (isRunning) return;

        const newId = `ping-${Date.now()}`;
        activeIdRef.current = newId;
        setInstanceId(newId);

        // Reset Data
        setLogs(["--- Starting Ping ---"]);
        setChartData([]);
        setStats({ min: 0, max: 0, avg: 0, current: 0, sent: 0, lost: 0 });
        setIsRunning(true);

        try {
            const res = await UniversalDriver.invoke(TOOL_ID, 'run', {
                host: target,
                id: newId
            });
            if (res.status === 'error') {
                setLogs(prev => [...prev, `Error: ${res.message}`]);
                setIsRunning(false);
            }
        } catch (e) {
            console.error(e);
            setIsRunning(false);
        }
    };

    const handleStop = async () => {
        if (!instanceId) return;

        setLogs(prev => [...prev, "--- Stopping... ---"]);
        await UniversalDriver.invoke(TOOL_ID, 'stop', { instance_id: instanceId });
        // The 'ping-done' event will set isRunning to false
        // But we set it here optimistically/just in case
        // activeIdRef.current = null; // Don't clear ref yet, let trailing logs come in
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900/50 p-6 space-y-6">
            {/* Header / Config */}
            <div className="flex flex-col md:flex-row md:items-end gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4">
                        <Zap className="mr-2 text-blue-500" />
                        Network Connectivity Test
                    </h2>
                    <div className="flex gap-4 items-end">
                        <Input
                            label="Target Host"
                            placeholder="IP Address or Domain (e.g., 8.8.8.8)"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            wrapperClassName="flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleStart()}
                            disabled={isRunning}
                        />
                        <div className="pb-[1px]">
                            {!isRunning ? (
                                <Button
                                    variant="primary"
                                    icon={Play}
                                    onClick={handleStart}
                                    className="min-w-[120px] h-[42px]"
                                >
                                    Start
                                </Button>
                            ) : (
                                <Button
                                    variant="danger"
                                    icon={Square}
                                    onClick={handleStop}
                                    className="min-w-[120px] h-[42px]"
                                >
                                    Stop
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Status Indicator */}
                <div className="hidden md:flex flex-col items-end justify-center px-4 border-l dark:border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
                    <div className={`flex items-center font-mono font-bold ${isRunning ? 'text-green-500' : 'text-gray-400'}`}>
                        <Activity size={18} className={`mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
                        {isRunning ? 'RUNNING' : 'IDLE'}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Current Latency" value={stats.current} unit="ms" />
                <StatsCard label="Average" value={stats.avg} unit="ms" />
                <StatsCard label="Min / Max" value={`${stats.min} / ${stats.max}`} unit="ms" />
                <StatsCard label="Packet Loss" value={stats.lost} unit="pkt" color="text-red-500" />
            </div>

            {/* Main Content: Chart & Log (Vertical Stack) */}
            <div className="flex-1 min-h-0 flex flex-col gap-6">

                {/* Chart Area (Fixed Height) */}
                <div className="h-64 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col p-4 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-500 flex items-center">
                            <BarChart2 size={16} className="mr-2" />
                            Latency Analysis
                        </h3>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                                <XAxis dataKey="time" hide />
                                <YAxis
                                    domain={[0, 'auto']}
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="latency"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Log Console (Fixed Height) */}
                <div className="min-h-0">
                    <LogConsole logs={logs} height="h-80" className="rounded-xl shadow-sm border-0" />
                </div>
            </div>
        </div>
    );
}
