import React, { useState, useEffect } from 'react';
import { FileText, Activity, AlertTriangle, Search, Play, ChevronDown, ChevronRight, Copy, X, List, ChevronLeft, BarChart2, Sliders } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RtpLogo = () => (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="12" width="44" height="24" rx="6" stroke="#EF4444" strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">RTP</text>
    </svg>
);

const RtpPanel = ({ t }) => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState('');
    const [detectedFlows, setDetectedFlows] = useState([]);
    const [selectedFlowIndex, setSelectedFlowIndex] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const [activeTab, setActiveTab] = useState('stream'); // 'stream', 'packets', 'handshake'
    
    // Pagination
    const [framePage, setFramePage] = useState(1);
    const framesPerPage = 10;
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
            const res = await window.pywebview.api.detect_rtp_flow(selectedFile);
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
        setFramePage(1);
        try {
            const res = await window.pywebview.api.analyze_rtp(selectedFile, flow.sport, flow.dport);
            if (res.status === 'success') {
                setResult(res);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-2 shadow-sm border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <RtpLogo />
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">RTP Stream Analysis</h1>
                        </div>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('stream')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'stream' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <Activity size={16} /> Stream Select
                            </button>
                            <button onClick={() => setActiveTab('packets')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'packets' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <List size={16} /> Packets
                            </button>
                            <button onClick={() => setActiveTab('handshake')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'handshake' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <FileText size={16} /> Handshake
                            </button>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Tab Content */}
                {activeTab === 'stream' && (
                    <div className="space-y-4">
                        {/* Controls */}
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
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packets</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Throughput</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {detectedFlows
                                                .slice((flowPage - 1) * flowsPerPage, flowPage * flowsPerPage)
                                                .map((flow, idx) => {
                                                const realIdx = (flowPage - 1) * flowsPerPage + idx;
                                                const isRtp = flow.protocol === 'RTP';
                                                return (
                                                    <tr 
                                                        key={realIdx} 
                                                        className={`${isRtp ? 'cursor-pointer hover:bg-blue-50' : 'bg-gray-50 opacity-60 cursor-not-allowed'} ${selectedFlowIndex === realIdx ? 'bg-blue-100' : ''}`}
                                                        onClick={() => isRtp && setSelectedFlowIndex(realIdx)}
                                                    >
                                                        <td className="px-4 py-2">
                                                            <input 
                                                                type="radio" 
                                                                name="flowSelect" 
                                                                checked={selectedFlowIndex === realIdx}
                                                                onChange={() => isRtp && setSelectedFlowIndex(realIdx)}
                                                                disabled={!isRtp}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-bold">
                                                            <span className={`px-2 py-1 rounded text-xs ${
                                                                flow.protocol === 'RTP' ? 'bg-blue-100 text-blue-800' : 
                                                                flow.protocol === 'RTCP' ? 'bg-green-100 text-green-800' : 
                                                                'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {flow.protocol}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{flow.src_ip}:{flow.sport}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{flow.dst_ip}:{flow.dport}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{flow.packet_count}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{formatBytes(flow.total_bytes)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{flow.throughput_mbps.toFixed(2)} Mbps</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {/* Flow Pagination */}
                                    {detectedFlows.length > flowsPerPage && (
                                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                            <div className="flex flex-1 justify-between sm:hidden">
                                                <button
                                                    onClick={() => setFlowPage(p => Math.max(1, p - 1))}
                                                    disabled={flowPage === 1}
                                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setFlowPage(p => Math.min(Math.ceil(detectedFlows.length / flowsPerPage), p + 1))}
                                                    disabled={flowPage >= Math.ceil(detectedFlows.length / flowsPerPage)}
                                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{(flowPage - 1) * flowsPerPage + 1}</span> to <span className="font-medium">{Math.min(flowPage * flowsPerPage, detectedFlows.length)}</span> of <span className="font-medium">{detectedFlows.length}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                        <button
                                                            onClick={() => setFlowPage(p => Math.max(1, p - 1))}
                                                            disabled={flowPage === 1}
                                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                        >
                                                            <span className="sr-only">Previous</span>
                                                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                                        </button>
                                                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                                            Page {flowPage}
                                                        </span>
                                                        <button
                                                            onClick={() => setFlowPage(p => Math.min(Math.ceil(detectedFlows.length / flowsPerPage), p + 1))}
                                                            disabled={flowPage >= Math.ceil(detectedFlows.length / flowsPerPage)}
                                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                        >
                                                            <span className="sr-only">Next</span>
                                                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                                        </button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={loading || selectedFlowIndex === null}
                                    className={`px-6 py-2 rounded-md flex items-center space-x-2 ${
                                        loading || selectedFlowIndex === null 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
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

                        {/* Results Summary */}
                        {result && result.rtp && (
                            <div className="space-y-4 pb-8">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Throughput</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {result.rtp.basic_stats.throughput_mbps.toFixed(2)} Mbps
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Duration: {result.rtp.basic_stats.duration_sec.toFixed(2)}s
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Packet Loss</div>
                                        <div className={`text-2xl font-bold ${result.rtp.loss_stats.loss_rate_percent > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.rtp.loss_stats.loss_rate_percent.toFixed(2)}%
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Lost: {result.rtp.loss_stats.packets_lost} / Total: {result.rtp.basic_stats.total_packets}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Est. FPS</div>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {result.rtp.frame_stats.iat_stats.fps.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Avg Frame Size: {formatBytes(result.rtp.frame_stats.avg_frame_size_bytes)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Jitter / Gaps</div>
                                        <div className={`text-2xl font-bold ${result.rtp.frame_stats.gap_analysis.count > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                            {result.rtp.frame_stats.gap_analysis.count}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Reordered Pkts: {result.rtp.loss_stats.reordered_packets}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Stats Grid */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                        <Activity size={16} /> Detailed Statistics
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 block">Packet IAT (Avg)</span>
                                            <span className="font-mono">{result.rtp.packet_iat_stats.avg_ms.toFixed(3)} ms</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Packet IAT (Max)</span>
                                            <span className="font-mono">{result.rtp.packet_iat_stats.max_ms.toFixed(3)} ms</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Frame IAT (Avg)</span>
                                            <span className="font-mono">{result.rtp.frame_stats.iat_stats.avg_ms.toFixed(3)} ms</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Frame IAT (Max)</span>
                                            <span className="font-mono">{result.rtp.frame_stats.iat_stats.max_ms.toFixed(3)} ms</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">SSRCs Found</span>
                                            <span className="font-mono">{result.rtp.basic_stats.ssrcs.join(', ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Seq Num Range</span>
                                            <span className="font-mono">{result.rtp.loss_stats.seq_range[0]} - {result.rtp.loss_stats.seq_range[1]}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-80">
                                        <h3 className="text-sm font-medium text-gray-700 mb-4">Frame Sizes (Bytes)</h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={result.rtp.frame_stats.raw_frames_list}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="end_time" tickFormatter={(val) => val.toFixed(1)} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="size" stroke="#2563eb" dot={false} strokeWidth={1.5} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-80">
                                        <h3 className="text-sm font-medium text-gray-700 mb-4">Frame Interval (ms)</h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={result.rtp.frame_stats.raw_frames_list.slice(1).map((f, i) => ({
                                                time: f.end_time,
                                                iat: (f.end_time - result.rtp.frame_stats.raw_frames_list[i].end_time) * 1000
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="time" tickFormatter={(val) => val.toFixed(1)} />
                                                <YAxis />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="iat" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Packets Tab */}
                {activeTab === 'packets' && result && result.rtp && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-4">Frame Analysis</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NAL Units</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {result.rtp.frame_stats.raw_frames_list
                                        .slice((framePage - 1) * framesPerPage, framePage * framesPerPage)
                                        .map((frame, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(framePage - 1) * framesPerPage + idx + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {frame.end_time.toFixed(3)}s
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${frame.type === 'I' ? 'bg-red-100 text-red-800' : 
                                                      frame.type === 'P' ? 'bg-blue-100 text-blue-800' : 
                                                      'bg-gray-100 text-gray-800'}`}>
                                                    {frame.type}-Frame
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatBytes(frame.size)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="flex flex-wrap gap-1">
                                                    {frame.nal_types && frame.nal_types.map((nal, nIdx) => (
                                                        <span key={nIdx} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs border border-gray-200">
                                                            {nal}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setFramePage(p => Math.max(1, p - 1))}
                                    disabled={framePage === 1}
                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setFramePage(p => Math.min(Math.ceil(result.rtp.frame_stats.raw_frames_list.length / framesPerPage), p + 1))}
                                    disabled={framePage >= Math.ceil(result.rtp.frame_stats.raw_frames_list.length / framesPerPage)}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(framePage - 1) * framesPerPage + 1}</span> to <span className="font-medium">{Math.min(framePage * framesPerPage, result.rtp.frame_stats.raw_frames_list.length)}</span> of <span className="font-medium">{result.rtp.frame_stats.raw_frames_list.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setFramePage(p => Math.max(1, p - 1))}
                                            disabled={framePage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                            Page {framePage}
                                        </span>
                                        <button
                                            onClick={() => setFramePage(p => Math.min(Math.ceil(result.rtp.frame_stats.raw_frames_list.length / framesPerPage), p + 1))}
                                            disabled={framePage >= Math.ceil(result.rtp.frame_stats.raw_frames_list.length / framesPerPage)}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Handshake Tab */}
                {activeTab === 'handshake' && result && result.handshake && result.handshake.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-medium text-gray-700">RTSP Handshake</h3>
                            <button 
                                onClick={() => setShowRawJson(true)}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded flex items-center gap-1"
                            >
                                <FileText size={12} /> Show Raw JSON
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {result.handshake.map((msg, idx) => (
                                <RTSPMessage key={idx} msg={msg} />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Empty States for Tabs */}
                {(activeTab === 'packets' || activeTab === 'handshake') && !result && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>Please analyze a stream first to view {activeTab} details.</p>
                    </div>
                )}
            </div>
            {showRawJson && result && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg">Raw RTSP Handshake Data</h3>
                            <button onClick={() => setShowRawJson(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-gray-50">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(result.handshake, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(result.handshake, null, 2));
                                    alert('Copied to clipboard!');
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Copy size={16} /> Copy JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RTSPMessage = ({ msg }) => {
    const [expanded, setExpanded] = useState(false);
    const isRequest = msg.type === 'request';
    
    return (
        <div className="border border-gray-200 rounded overflow-hidden">
            <div 
                className={`px-4 py-2 flex items-center justify-between cursor-pointer ${isRequest ? 'bg-blue-50' : 'bg-green-50'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isRequest ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                        {msg.method}
                    </span>
                    <span className="text-sm font-mono truncate" title={msg.uri || msg.status}>
                        {msg.uri || msg.status}
                    </span>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                </span>
            </div>
            
            {expanded && (
                <div className="p-4 bg-white text-sm border-t border-gray-200">
                    <div className="grid grid-cols-1 gap-2">
                        {Object.entries(msg.headers || {}).map(([key, val]) => (
                            <div key={key} className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-1 last:border-0">
                                <span className="font-medium text-gray-600 break-words">{key}</span>
                                <span className="col-span-2 font-mono text-gray-800 break-all">{val}</span>
                            </div>
                        ))}
                        {msg.body && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="font-medium text-gray-600 mb-1">Body</div>
                                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                    {msg.body}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RtpPanel;
