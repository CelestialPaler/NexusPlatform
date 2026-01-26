import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Trash2, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PingInstance = ({ instance, onUpdate, t }) => {
    const [logs, setLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const logsEndRef = useRef(null);

    useEffect(() => {
        const handleLog = (e) => {
            if (e.detail.id === instance.id) {
                setLogs(prev => {
                    const newLogs = [...prev, e.detail.data];
                    if (newLogs.length > 100) newLogs.shift(); // Limit logs
                    return newLogs;
                });
            }
        };
        const handleData = (e) => {
            if (e.detail.id === instance.id) {
                const point = e.detail.data;
                setChartData(prev => {
                    const newData = [...prev, { time: point.timestamp, latency: point.latency }];
                    if (newData.length > 50) newData.shift();
                    return newData;
                });
            }
        };
        const handleDone = (e) => {
            if (e.detail.id === instance.id) {
                onUpdate(instance.id, { status: 'idle' });
            }
        };
        const handleError = (e) => {
            if (e.detail.id === instance.id) {
                setLogs(prev => [...prev, `Error: ${e.detail.data}`]);
                onUpdate(instance.id, { status: 'idle' });
            }
        };

        window.addEventListener('ping-log', handleLog);
        window.addEventListener('ping-data', handleData);
        window.addEventListener('ping-done', handleDone);
        window.addEventListener('ping-error', handleError);

        return () => {
            window.removeEventListener('ping-log', handleLog);
            window.removeEventListener('ping-data', handleData);
            window.removeEventListener('ping-done', handleDone);
            window.removeEventListener('ping-error', handleError);
        };
    }, [instance.id]);

    useEffect(() => {
        if (logsEndRef.current) {
            // Only scroll if near bottom or if it's a new run
            logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [logs]);

    const handleStart = async () => {
        setLogs([]);
        setChartData([]);

        if (window.pywebview) {
            const res = await window.pywebview.api.run_ping({ ...instance.config, id: instance.id });
            if (res.status === 'started') {
                onUpdate(instance.id, { status: 'running' });
                setLogs(prev => [...prev, `Command: ${res.command}`]);
            } else {
                alert(res.message);
            }
        } else {
            // Mock
            onUpdate(instance.id, { status: 'running' });
            setLogs(["Mock ping started..."]);
            const interval = setInterval(() => {
                const latency = Math.floor(Math.random() * 100);
                window.dispatchEvent(new CustomEvent('ping-data', {
                    detail: { id: instance.id, data: { timestamp: new Date().toLocaleTimeString(), latency } }
                }));
                window.dispatchEvent(new CustomEvent('ping-log', {
                    detail: { id: instance.id, data: `Reply from 127.0.0.1: bytes=32 time=${latency}ms TTL=128` }
                }));
            }, 1000);
            setTimeout(() => { clearInterval(interval); window.dispatchEvent(new CustomEvent('ping-done', { detail: { id: instance.id } })); }, 10000);
        }
    };

    const handleStop = async () => {
        if (window.pywebview) {
            await window.pywebview.api.stop_ping(instance.id);
        }
        onUpdate(instance.id, { status: 'idle' });
    };

    const updateConfig = (key, value) => {
        onUpdate(instance.id, { config: { ...instance.config, [key]: value } });
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Config Panel */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{instance.name} - {t.config}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Host</label>
                            <input
                                type="text"
                                value={instance.config.host}
                                onChange={(e) => updateConfig('host', e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="127.0.0.1 or google.com"
                            />
                        </div>

                        <div className="pt-4 flex gap-2">
                            {instance.status === 'idle' ? (
                                <button
                                    onClick={handleStart}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <Play size={18} /> {t.start}
                                </button>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                >
                                    <Square size={18} /> {t.stop}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chart & Logs */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-shrink-0 h-[300px]">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Latency (ms)</h2>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-sm flex-1 overflow-auto shadow-inner min-h-0">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const PingPanel = ({ t }) => {
    const [instances, setInstances] = useState([
        { id: 'default-1', name: 'Ping Task 1', status: 'idle', config: { host: '8.8.8.8' } }
    ]);

    const addInstance = () => {
        const newId = `ping-${Date.now()}`;
        setInstances([...instances, { id: newId, name: `Ping Task ${instances.length + 1}`, status: 'idle', config: { host: '127.0.0.1' } }]);
    };

    const removeInstance = (id) => {
        if (instances.length > 1) {
            setInstances(instances.filter(i => i.id !== id));
        }
    };

    const updateInstance = (id, updates) => {
        setInstances(instances.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const PingLogo = ({ color = "#10b981" }) => (
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="12" width="44" height="24" rx="6" stroke={color} strokeWidth="2.5" />
            <text x="24" y="28" textAnchor="middle" fill={color} fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">PING</text>
        </svg>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <PingLogo /> Ping Tool
                </h1>
            </div>

            <div className="flex-1 overflow-auto space-y-8">
                {instances.map(instance => (
                    <div key={instance.id} className="relative border-b border-gray-200 dark:border-gray-700 pb-8 last:border-0">
                        {instances.length > 1 && (
                            <button
                                onClick={() => removeInstance(instance.id)}
                                className="absolute top-0 right-0 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <PingInstance instance={instance} onUpdate={updateInstance} t={t} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PingPanel;
