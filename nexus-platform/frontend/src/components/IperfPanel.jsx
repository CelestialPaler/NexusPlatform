import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Trash2, Monitor, Server } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const IperfInstance = ({ instance, onUpdate, t }) => {
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [instance.logs]);

    const handleStart = async () => {
        onUpdate(instance.id, { logs: [], chartData: [] });
        
        if (window.pywebview) {
            const res = await window.pywebview.api.run_iperf({ ...instance.config, id: instance.id });
            if (res.status === 'started') {
                onUpdate(instance.id, { 
                    status: 'running',
                    logs: [`Command: ${res.command}`] 
                });
            } else {
                alert(res.message);
            }
        } else {
            // Mock
            onUpdate(instance.id, { status: 'running', logs: ["Mock started..."], chartData: [] });
            const interval = setInterval(() => {
                window.dispatchEvent(new CustomEvent('iperf-data', { 
                    detail: { id: instance.id, data: { timestamp: new Date().toLocaleTimeString(), bandwidth: Math.random() * 100 } } 
                }));
            }, 1000);
            setTimeout(() => { 
                clearInterval(interval); 
                window.dispatchEvent(new CustomEvent('iperf-done', { detail: { id: instance.id } })); 
            }, 5000);
        }
    };

    const handleStop = async () => {
        if (window.pywebview) {
            await window.pywebview.api.stop_iperf(instance.id);
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version</label>
                            <select 
                                value={instance.config.version}
                                onChange={e => updateConfig('version', e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={instance.status === 'running'}
                            >
                                <option value="iperf3">iPerf 3</option>
                                <option value="iperf2">iPerf 2</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                            <div className="flex gap-4">
                                <label className="flex items-center dark:text-gray-300">
                                    <input 
                                        type="radio" 
                                        name={`mode-${instance.id}`} 
                                        value="client" 
                                        checked={instance.config.mode === 'client'} 
                                        onChange={e => updateConfig('mode', e.target.value)} 
                                        className="mr-2" 
                                        disabled={instance.status === 'running'}
                                    />
                                    Client
                                </label>
                                <label className="flex items-center dark:text-gray-300">
                                    <input 
                                        type="radio" 
                                        name={`mode-${instance.id}`} 
                                        value="server" 
                                        checked={instance.config.mode === 'server'} 
                                        onChange={e => updateConfig('mode', e.target.value)} 
                                        className="mr-2" 
                                        disabled={instance.status === 'running'}
                                    />
                                    Server
                                </label>
                            </div>
                        </div>
                        {instance.config.mode === 'client' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host</label>
                                <input 
                                    type="text" 
                                    value={instance.config.host}
                                    onChange={e => updateConfig('host', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={instance.status === 'running'}
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                                <input 
                                    type="number" 
                                    value={instance.config.port}
                                    onChange={e => updateConfig('port', parseInt(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={instance.status === 'running'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interval (s)</label>
                                <input 
                                    type="number" 
                                    value={instance.config.interval}
                                    onChange={e => updateConfig('interval', parseInt(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={instance.status === 'running'}
                                />
                            </div>
                        </div>

                        {/* New Config Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parallel Streams (-P)</label>
                                <input 
                                    type="number" 
                                    value={instance.config.parallel || 1}
                                    onChange={e => updateConfig('parallel', parseInt(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={instance.status === 'running'}
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format (-f)</label>
                                <select 
                                    value={instance.config.format || 'm'}
                                    onChange={e => updateConfig('format', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={instance.status === 'running'}
                                >
                                    <option value="k">kbits</option>
                                    <option value="m">mbits</option>
                                    <option value="g">gbits</option>
                                    <option value="K">KBytes</option>
                                    <option value="M">MBytes</option>
                                    <option value="G">GBytes</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center dark:text-gray-300">
                                <input 
                                    type="checkbox" 
                                    checked={instance.config.udp}
                                    onChange={e => updateConfig('udp', e.target.checked)}
                                    className="mr-2"
                                    disabled={instance.status === 'running'}
                                />
                                UDP Mode
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Arguments</label>
                            <input 
                                type="text" 
                                value={instance.config.extra_args}
                                onChange={e => updateConfig('extra_args', e.target.value)}
                                placeholder="-t 10 -P 4"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={instance.status === 'running'}
                            />
                        </div>
                        <div className="pt-4">
                            {instance.status !== 'running' ? (
                                <button 
                                    onClick={handleStart}
                                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Play size={16} /> {t.start}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleStop}
                                    className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Square size={16} /> {t.stop}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Visualization & Logs */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-1/2 flex flex-col">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t.bandwidth}</h2>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={instance.chartData || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="bandwidth" stroke="#8884d8" activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-black text-green-400 p-4 rounded-xl shadow-sm border border-gray-800 h-1/2 overflow-auto font-mono text-xs">
                        {(instance.logs || []).map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const IperfPanel = ({ t }) => {
    const [instances, setInstances] = useState([
        {
            id: 'default-1',
            name: 'Instance 1',
            status: 'idle',
            logs: [],
            chartData: [],
            config: {
                version: 'iperf3',
                mode: 'client',
                host: '127.0.0.1',
                port: 5201,
                interval: 1,
                parallel: 1,
                format: 'm',
                udp: false,
                extra_args: ''
            }
        }
    ]);
    const [selectedId, setSelectedId] = useState('default-1');

    // Global event listeners for all instances
    useEffect(() => {
        const handleLog = (e) => {
            setInstances(prev => prev.map(inst => 
                inst.id === e.detail.id 
                    ? { ...inst, logs: [...(inst.logs || []), e.detail.data] } 
                    : inst
            ));
        };
        const handleData = (e) => {
            setInstances(prev => prev.map(inst => {
                if (inst.id === e.detail.id) {
                    const point = e.detail.data;
                    const currentData = inst.chartData || [];
                    const newData = [...currentData, { time: point.timestamp, bandwidth: point.bandwidth }];
                    if (newData.length > 20) newData.shift();
                    return { ...inst, chartData: newData };
                }
                return inst;
            }));
        };
        const handleDone = (e) => {
            setInstances(prev => prev.map(inst => 
                inst.id === e.detail.id 
                    ? { ...inst, status: 'idle' } 
                    : inst
            ));
        };
        const handleError = (e) => {
            setInstances(prev => prev.map(inst => 
                inst.id === e.detail.id 
                    ? { ...inst, status: 'idle', logs: [...(inst.logs || []), `Error: ${e.detail.data}`] } 
                    : inst
            ));
        };

        window.addEventListener('iperf-log', handleLog);
        window.addEventListener('iperf-data', handleData);
        window.addEventListener('iperf-done', handleDone);
        window.addEventListener('iperf-error', handleError);

        return () => {
            window.removeEventListener('iperf-log', handleLog);
            window.removeEventListener('iperf-data', handleData);
            window.removeEventListener('iperf-done', handleDone);
            window.removeEventListener('iperf-error', handleError);
        };
    }, []);

    const addInstance = () => {
        const newId = `inst-${Date.now()}`;
        setInstances(prev => [...prev, {
            id: newId,
            name: `Instance ${prev.length + 1}`,
            status: 'idle',
            logs: [],
            chartData: [],
            config: {
                version: 'iperf3',
                mode: 'client',
                host: '127.0.0.1',
                port: 5201,
                interval: 1,
                parallel: 1,
                format: 'm',
                udp: false,
                extra_args: ''
            }
        }]);
        setSelectedId(newId);
    };

    const deleteInstance = (id) => {
        if (instances.length <= 1) return;
        const newInstances = instances.filter(i => i.id !== id);
        setInstances(newInstances);
        if (selectedId === id) {
            setSelectedId(newInstances[0].id);
        }
    };

    const updateInstance = (id, updates) => {
        setInstances(prev => prev.map(inst => 
            inst.id === id ? { ...inst, ...updates } : inst
        ));
    };

    const selectedInstance = instances.find(i => i.id === selectedId);

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar List */}
            <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Instances</h3>
                    <button onClick={addInstance} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {instances.map(inst => (
                        <div 
                            key={inst.id}
                            onClick={() => setSelectedId(inst.id)}
                            className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group ${selectedId === inst.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 border' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                {inst.config.mode === 'server' ? <Server size={16} className="text-purple-500" /> : <Monitor size={16} className="text-green-500" />}
                                <div className="truncate">
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{inst.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {inst.status === 'running' ? <span className="text-green-500">Running</span> : 'Idle'}
                                    </div>
                                </div>
                            </div>
                            {instances.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteInstance(inst.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-400 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {selectedInstance && (
                    <IperfInstance 
                        key={selectedInstance.id} 
                        instance={selectedInstance} 
                        onUpdate={updateInstance}
                        t={t}
                    />
                )}
            </div>
        </div>
    );
};

export default IperfPanel;
