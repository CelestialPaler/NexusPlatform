import React, { useState, useEffect } from 'react';
import { FileText, Activity, AlertTriangle, Search, Play, ChevronDown, ChevronRight, List, ChevronLeft, Wifi, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

const BaLogo = () => (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="12" width="44" height="24" rx="6" stroke="#8B5CF6" strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">BA</text>
    </svg>
);

const BaPanel = () => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState('');
    const [detectedFlows, setDetectedFlows] = useState([]);
    const [selectedFlowIndex, setSelectedFlowIndex] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('stream'); // 'stream', 'packets', 'chart'
    
    // Pagination
    const [packetPage, setPacketPage] = useState(1);
    const packetsPerPage = 10;
    const [flowPage, setFlowPage] = useState(1);
    const flowsPerPage = 10;

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            const fileList = await window.pywebview.api.list_pcap_files();
            setFiles(fileList);
            if (fileList.length > 0) {
                setSelectedFile(fileList[0]);
            }
        } catch (err) {
            console.error("Failed to load files", err);
        }
    };

    const handleDetect = async () => {
        if (!selectedFile) return;
        setDetecting(true);
        setError(null);
        setDetectedFlows([]);
        setSelectedFlowIndex(null);
        try {
            const res = await window.pywebview.api.detect_ba_flow(selectedFile);
            if (res.status === 'success') {
                setDetectedFlows(res.flows);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Detection failed");
        } finally {
            setDetecting(false);
        }
    };

    const handleAnalyze = async () => {
        if (selectedFlowIndex === null || !detectedFlows[selectedFlowIndex]) return;
        
        const flow = detectedFlows[selectedFlowIndex];
        setLoading(true);
        setError(null);
        setResult(null);
        setPacketPage(1);
        try {
            const res = await window.pywebview.api.analyze_ba(selectedFile, flow.sa, flow.da, flow.tid);
            if (res.status === 'success') {
                setResult(res);
                setActiveTab('packets');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-2 shadow-sm border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <BaLogo />
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">BA Analysis Tool</h1>
                        </div>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('stream')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'stream' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <Activity size={16} /> Stream Select
                            </button>
                            <button onClick={() => setActiveTab('packets')} disabled={!result} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'packets' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'}`}>
                                <List size={16} /> Packets
                            </button>
                            <button onClick={() => setActiveTab('chart')} disabled={!result} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'chart' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'}`}>
                                <BarChart2 size={16} /> Analysis Chart
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Stream Selection Tab */}
                {activeTab === 'stream' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PCAP File</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={selectedFile}
                                        onChange={(e) => {
                                            setSelectedFile(e.target.value);
                                            setDetectedFlows([]);
                                            setSelectedFlowIndex(null);
                                            setResult(null);
                                        }}
                                    >
                                        {files.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <button 
                                    onClick={loadFiles}
                                    className="mt-6 p-2 text-gray-500 hover:text-gray-700"
                                    title="Refresh Files"
                                >
                                    <FileText size={20} />
                                </button>
                                <button 
                                    onClick={handleDetect}
                                    disabled={detecting || !selectedFile}
                                    className="mt-6 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center space-x-2"
                                >
                                    <Search size={16} />
                                    <span>{detecting ? 'Detecting...' : 'Auto Detect'}</span>
                                </button>
                            </div>

                            {/* Flow List */}
                            {detectedFlows.length > 0 && (
                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SA (Data Src)</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DA (Data Dst)</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TID</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packets</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {detectedFlows
                                                .slice((flowPage - 1) * flowsPerPage, flowPage * flowsPerPage)
                                                .map((flow, idx) => {
                                                const realIdx = (flowPage - 1) * flowsPerPage + idx;
                                                return (
                                                    <tr 
                                                        key={realIdx} 
                                                        className={`cursor-pointer hover:bg-purple-50 ${selectedFlowIndex === realIdx ? 'bg-purple-100' : ''}`}
                                                        onClick={() => setSelectedFlowIndex(realIdx)}
                                                    >
                                                        <td className="px-4 py-2">
                                                            <input 
                                                                type="radio" 
                                                                name="flowSelect" 
                                                                checked={selectedFlowIndex === realIdx}
                                                                onChange={() => setSelectedFlowIndex(realIdx)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-bold text-purple-700">802.11 QoS</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{flow.sa}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{flow.da}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 font-bold">{flow.tid}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{flow.packets}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500 text-xs">
                                                            Data: {flow.data_count}, BA: {flow.ba_count}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {/* Pagination Controls ... (Simplified) */}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={loading || selectedFlowIndex === null}
                                    className={`px-6 py-2 rounded-md flex items-center space-x-2 ${
                                        loading || selectedFlowIndex === null 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                    }`}
                                >
                                    <Play size={16} />
                                    <span>{loading ? 'Analyzing...' : 'Analyze Selected Flow'}</span>
                                </button>
                            </div>
                            
                            {error && (
                                <div className="text-red-600 text-sm flex items-center space-x-2 bg-red-50 p-2 rounded">
                                    <AlertTriangle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Packets Tab */}
                {activeTab === 'packets' && result && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                         {/* Anomalies Summary */}
                         {result.anomaly_count > 0 && (
                            <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 flex items-center">
                                <AlertTriangle size={20} className="mr-2"/>
                                Found {result.anomaly_count} potential anomalies (BlockAck regression).
                            </div>
                        )}

                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seq</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Len</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Info</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {result.data
                                        .slice((packetPage - 1) * packetsPerPage, packetPage * packetsPerPage)
                                        .map((pkt, idx) => (
                                        <tr key={idx} className={pkt.valid === false ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-2 text-xs text-gray-500">{pkt.id}</td>
                                            <td className="px-4 py-2 text-xs font-mono">{pkt.time_str}</td>
                                            <td className="px-4 py-2 text-xs font-bold">
                                                <span className={`px-2 py-0.5 rounded ${pkt.type === 'QoS-Data' ? (pkt.retry ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-700') : 'bg-green-50 text-green-700'}`}>
                                                    {pkt.type} {pkt.retry ? '(Retry)' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs font-mono">
                                                {pkt.type === 'QoS-Data' ? `SN=${pkt.sn}` : `SSN=${pkt.ssn}`}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-500">{pkt.len ? pkt.len : '-'}</td>
                                            <td className="px-4 py-2 text-xs font-mono truncate max-w-md" title={pkt.bitmap || pkt.anomaly}>
                                                {pkt.anomaly ? <span className="text-red-600 font-bold">{pkt.anomaly}</span> : (pkt.bitmap || '')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="border-t border-gray-200 p-2 flex justify-between items-center bg-gray-50">
                             <button 
                                onClick={() => setPacketPage(p => Math.max(1, p - 1))}
                                disabled={packetPage === 1}
                                className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                             >Prior</button>
                             <span className="text-sm">Page {packetPage} of {Math.ceil(result.data.length / packetsPerPage)}</span>
                             <button 
                                onClick={() => setPacketPage(p => Math.min(Math.ceil(result.data.length / packetsPerPage), p + 1))}
                                disabled={packetPage >= Math.ceil(result.data.length / packetsPerPage)}
                                className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                             >Next</button>
                        </div>
                    </div>
                )}

                {/* Chart Tab */}
                {activeTab === 'chart' && result && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="time" name="Time" domain={['auto', 'auto']} tickFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleTimeString()} />
                                <YAxis type="number" dataKey="seq" name="Sequence Number" domain={['auto', 'auto']} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} labelFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleTimeString()} />
                                <Legend />
                                <Scatter name="QoS Data SN" data={result.data.filter(p => p.type === 'QoS-Data').map(p => ({ time: p.time, seq: p.sn }))} fill="#8884d8" shape="circle" />
                                <Scatter name="BlockAck SSN" data={result.data.filter(p => p.type === 'BlockAck').map(p => ({ time: p.time, seq: p.ssn }))} fill="#82ca9d" shape="rect" />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <div className="mt-4 text-sm text-gray-500 text-center">
                            X Axis: Time (s) | Y Axis: Sequence Number. Discontinuities or drops indicate reordering/loss.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaPanel;
