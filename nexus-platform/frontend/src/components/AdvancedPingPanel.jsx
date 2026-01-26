import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, Settings, Activity, BarChart2, TrendingUp, List, FileText, Sliders, Download, Upload, RefreshCw, HelpCircle, Plus, Trash2, CheckSquare, Square as SquareIcon } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Brush, ReferenceLine, ComposedChart, ScatterChart, Scatter
} from 'recharts';

// --- UI Helper Components ---
const SimpleTooltip = ({ text }) => (
    <div className="group relative flex items-center">
        <HelpCircle size={14} className="text-gray-400 cursor-help ml-1" />
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

// --- Statistical Helper Functions ---

// Simple DFT implementation for FFT visualization (Magnitude only)
const calculateFFT = (data, sampleRate = 1) => {
    if (!data || data.length < 4) return [];

    // 1. Interpolate to handle missing data/jitter (Resample at 1Hz or similar)
    // For simplicity, we assume the data is roughly periodic and just take the values.
    // In a real scenario, we'd resample based on timestamps.
    const values = data.map(d => d.latency || 0);
    const N = values.length;

    // Limit N to power of 2 or a reasonable size for performance
    const limit = Math.min(N, 128);
    const signal = values.slice(N - limit, N);

    const spectrum = [];
    for (let k = 0; k < limit / 2; k++) {
        let real = 0;
        let imag = 0;
        for (let n = 0; n < limit; n++) {
            const angle = (2 * Math.PI * k * n) / limit;
            real += signal[n] * Math.cos(angle);
            imag -= signal[n] * Math.sin(angle);
        }
        const magnitude = Math.sqrt(real * real + imag * imag);
        // Frequency axis: k * (SampleRate / N)
        spectrum.push({
            frequency: (k * sampleRate / limit).toFixed(2),
            magnitude: magnitude
        });
    }
    return spectrum;
};

const calculateStats = (data) => {
    if (!data || data.length === 0) return null;
    const values = data.filter(d => d.latency !== null).map(d => d.latency).sort((a, b) => a - b);

    // Jitter Calculation
    const jitters = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i].latency !== null && data[i - 1].latency !== null) {
            jitters.push(Math.abs(data[i].latency - data[i - 1].latency));
        }
    }
    const sortedJitters = [...jitters].sort((a, b) => a - b);

    const getPercentile = (arr, p) => {
        if (arr.length === 0) return 0;
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, Math.min(arr.length - 1, index))];
    };

    if (values.length === 0) return {
        count: 0, loss: data.length, min: 'N/A', max: 'N/A', mean: 'N/A',
        median: 'N/A', p90: 'N/A', p95: 'N/A', p99: 'N/A',
        jitter: { mean: 'N/A', min: 'N/A', max: 'N/A', median: 'N/A', p90: 'N/A', p95: 'N/A', p99: 'N/A' }
    };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const jitterSum = jitters.reduce((a, b) => a + b, 0);
    const jitterMean = jitters.length > 0 ? jitterSum / jitters.length : 0;

    return {
        count: data.length,
        loss: data.filter(d => d.latency === null).length,
        lossRate: ((data.filter(d => d.latency === null).length / data.length) * 100).toFixed(1),
        min: values[0],
        max: values[values.length - 1],
        mean: mean.toFixed(2),
        median: getPercentile(values, 50),
        p90: getPercentile(values, 90),
        p95: getPercentile(values, 95),
        p99: getPercentile(values, 99),
        jitter: {
            mean: jitterMean.toFixed(2),
            min: sortedJitters.length > 0 ? sortedJitters[0] : 0,
            max: sortedJitters.length > 0 ? sortedJitters[sortedJitters.length - 1] : 0,
            median: getPercentile(sortedJitters, 50),
            p90: getPercentile(sortedJitters, 90),
            p95: getPercentile(sortedJitters, 95),
            p99: getPercentile(sortedJitters, 99)
        }
    };
};

const calculateHistogram = (data, binSize = 5) => {
    if (!data || data.length === 0) return [];
    const values = data.filter(d => d.latency !== null).map(d => d.latency);
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);

    const start = Math.floor(min / binSize) * binSize;
    const end = Math.ceil(max / binSize) * binSize;

    const bins = {};
    for (let i = start; i <= end; i += binSize) {
        bins[i] = 0;
    }

    values.forEach(v => {
        const bin = Math.floor(v / binSize) * binSize;
        if (bins[bin] !== undefined) bins[bin]++;
    });

    return Object.keys(bins).map(k => ({
        range: `${k}-${parseInt(k) + binSize}ms`,
        binStart: parseInt(k),
        count: bins[k]
    })).sort((a, b) => a.binStart - b.binStart);
};

const calculateCDF = (data) => {
    if (!data || data.length === 0) return [];
    const values = data.filter(d => d.latency !== null).map(d => d.latency).sort((a, b) => a - b);
    if (values.length === 0) return [];

    const n = values.length;
    const cdf = [];
    let currentCount = 0;

    const freq = {};
    values.forEach(v => freq[v] = (freq[v] || 0) + 1);

    const uniqueValues = Object.keys(freq).map(Number).sort((a, b) => a - b);

    uniqueValues.forEach(v => {
        currentCount += freq[v];
        cdf.push({
            latency: v,
            probability: (currentCount / n) * 100
        });
    });

    return cdf;
};

const smoothData = (data, method, param) => {
    if (!data || data.length === 0) return [];
    // Filter out nulls for smoothing, or treat them as gaps? 
    // For simplicity, we'll skip nulls in smoothing calculation but keep time continuity if possible.
    // Actually, let's just smooth the valid values.

    const validData = data.filter(d => d.latency !== null);
    if (method === 'none') return validData.map((d, i) => ({ ...d, index: i }));

    const smoothed = [];

    if (method === 'sma') {
        const window = param || 5;
        for (let i = 0; i < validData.length; i++) {
            const start = Math.max(0, i - window + 1);
            const subset = validData.slice(start, i + 1);
            const avg = subset.reduce((a, b) => a + b.latency, 0) / subset.length;
            smoothed.push({ ...validData[i], latency: avg, index: i });
        }
    } else if (method === 'ewma') {
        const alpha = param || 0.2;
        let lastVal = validData[0].latency;
        smoothed.push({ ...validData[0], index: 0 });

        for (let i = 1; i < validData.length; i++) {
            const current = validData[i].latency;
            const newVal = alpha * current + (1 - alpha) * lastVal;
            smoothed.push({ ...validData[i], latency: newVal, index: i });
            lastVal = newVal;
        }
    }

    return smoothed;
};

const AdvancedPingPanel = ({ t: translations = {} }) => {
    // Helper to support t('key') syntax while t is passed as an object
    const t = (key) => translations?.[key] || key;

    // --- State ---
    // Session Manager: { [id]: { id, host, data: [], logs: [], status: 'idle'|'running'|'finished', color: '#hex', isReference: bool } }
    const [sessions, setSessions] = useState({});
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [comparisonSessionIds, setComparisonSessionIds] = useState([]);

    // Config for NEW sessions
    const [config, setConfig] = useState({
        host: '8.8.8.8',
        size: 32,
        ttl: 128,
        timeout: 1000,
        count: 0,
        fragment: false,
        resolve: false,
        ipVersion: 'auto'
    });

    const [activeTab, setActiveTab] = useState('monitor');

    // Chart Configurations
    const [chartConfig, setChartConfig] = useState({
        smoothing: 'none',
        smoothParam: 5, // SMA: window size, EWMA: alpha * 100 (slider 1-100)
        showRefLine: false,
        refLineValue: 100,
        useColorGradient: false,
        binSize: 5,
        cdfType: 'step', // 'step' or 'monotone'
    });

    const [activeSettingsMenu, setActiveSettingsMenu] = useState(null);
    const settingsRef = useRef(null);

    // Brush/Zoom State
    const [brushRange, setBrushRange] = useState({ startIndex: 0, endIndex: 0 });

    const logsEndRef = useRef(null);

    // Initialize default session
    useEffect(() => {
        const defaultId = `session-${Date.now()}`;
        setSessions({
            [defaultId]: {
                id: defaultId,
                host: '8.8.8.8',
                config: { ...config }, // Store config per session
                data: [],
                logs: [],
                status: 'idle',
                color: '#3b82f6',
                isReference: false,
                visible: true // For chart visibility
            }
        });
        setActiveSessionId(defaultId);
        setComparisonSessionIds([defaultId]);
    }, []);

    // --- Effects ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeSettingsMenu && !event.target.closest('.chart-settings-container')) {
                setActiveSettingsMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeSettingsMenu]);

    useEffect(() => {
        const handleData = (e) => {
            const { id, data } = e.detail;
            setSessions(prev => {
                if (!prev[id]) return prev;
                const newData = [...prev[id].data, data];
                if (newData.length > 5000) newData.shift(); // Limit history
                return {
                    ...prev,
                    [id]: { ...prev[id], data: newData }
                };
            });
        };
        const handleLog = (e) => {
            const { id, data } = e.detail;
            setSessions(prev => {
                if (!prev[id]) return prev;
                const newLogs = [...prev[id].logs, data];
                if (newLogs.length > 200) newLogs.shift();
                return {
                    ...prev,
                    [id]: { ...prev[id], logs: newLogs }
                };
            });
        };
        const handleDone = (e) => {
            const { id } = e.detail;
            setSessions(prev => {
                if (!prev[id]) return prev;
                return {
                    ...prev,
                    [id]: { ...prev[id], status: 'finished' }
                };
            });
        };
        const handleError = (e) => {
            const { id, data } = e.detail;
            setSessions(prev => {
                if (!prev[id]) return prev;
                return {
                    ...prev,
                    [id]: {
                        ...prev[id],
                        status: 'error',
                        logs: [...prev[id].logs, `Error: ${data}`]
                    }
                };
            });
        };

        window.addEventListener('ping-data', handleData);
        window.addEventListener('ping-log', handleLog);
        window.addEventListener('ping-done', handleDone);
        window.addEventListener('ping-error', handleError);

        return () => {
            window.removeEventListener('ping-data', handleData);
            window.removeEventListener('ping-log', handleLog);
            window.removeEventListener('ping-done', handleDone);
            window.removeEventListener('ping-error', handleError);
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'logs' && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [sessions, activeSessionId, activeTab]);

    // --- Handlers ---
    const handleAddSession = () => {
        const newId = `session-${Date.now()}`;
        // Generate a random color that is distinct and visible
        const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

        setSessions(prev => ({
            ...prev,
            [newId]: {
                id: newId,
                host: config.host, // Use current default config host
                config: { ...config }, // Copy current default config
                data: [],
                logs: [],
                status: 'idle',
                color: randomColor,
                isReference: false,
                visible: true
            }
        }));
        // Automatically add to comparison if it's the second session?
        setComparisonSessionIds(prev => [...prev, newId]);
    };

    const handleDeleteSession = (id) => {
        if (Object.keys(sessions).length <= 1) return; // Prevent deleting last session
        setSessions(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setComparisonSessionIds(prev => prev.filter(sid => sid !== id));
        if (activeSessionId === id) {
            const remaining = Object.keys(sessions).filter(k => k !== id);
            if (remaining.length > 0) setActiveSessionId(remaining[0]);
        }
    };

    const handleStartSelected = () => {
        comparisonSessionIds.forEach(id => {
            if (sessions[id] && sessions[id].status !== 'running' && !sessions[id].isReference) {
                handleStart(id);
            }
        });
    };

    const handleStopSelected = () => {
        comparisonSessionIds.forEach(id => {
            if (sessions[id] && sessions[id].status === 'running') {
                handleStop(id);
            }
        });
    };

    const handleStart = async (id) => {
        const targetId = id || activeSessionId;
        if (!targetId || !sessions[targetId]) return;

        const session = sessions[targetId];

        // Reset data for session
        setSessions(prev => ({
            ...prev,
            [targetId]: {
                ...prev[targetId],
                data: [],
                logs: [],
                status: 'running'
            }
        }));

        // Only reset brush if it's the active one? Maybe not needed.

        if (window.pywebview) {
            const res = await window.pywebview.api.run_ping({ ...session.config, id: targetId });
            if (res.status === 'started') {
                // setActiveTab('monitor'); // Don't auto switch if managing multiple
            } else {
                alert(res.message);
                setSessions(prev => ({
                    ...prev,
                    [targetId]: { ...prev[targetId], status: 'error' }
                }));
            }
        } else {
            // Mock
            setSessions(prev => ({
                ...prev,
                [targetId]: { ...prev[targetId], status: 'running' }
            }));

            const interval = setInterval(() => {
                const isLoss = Math.random() > 0.98;
                const latency = isLoss ? null : Math.floor(Math.random() * 50) + 20 + (Math.random() > 0.8 ? 100 : 0);
                const timestamp = new Date().toLocaleTimeString();

                window.dispatchEvent(new CustomEvent('ping-data', {
                    detail: { id: targetId, data: { timestamp, latency, error: isLoss ? 'timeout' : null } }
                }));
                window.dispatchEvent(new CustomEvent('ping-log', {
                    detail: { id: targetId, data: isLoss ? 'Request timed out.' : `Reply from ${session.config.host}: bytes=${session.config.size} time=${latency}ms TTL=${session.config.ttl}` }
                }));
            }, 200);

            // Store interval ID to clear it later? 
            // For mock, we just set a timeout to stop it. In real app, backend handles it.
            setTimeout(() => {
                clearInterval(interval);
                setSessions(prev => {
                    if (!prev[targetId] || prev[targetId].status !== 'running') return prev;
                    return {
                        ...prev,
                        [targetId]: { ...prev[targetId], status: 'finished' }
                    };
                });
            }, 30000);
        }
    };

    const handleStop = async (id) => {
        const targetId = id || activeSessionId;
        if (window.pywebview) {
            await window.pywebview.api.stop_ping(targetId);
        }
        setSessions(prev => ({
            ...prev,
            [targetId]: { ...prev[targetId], status: 'finished' }
        }));
    };

    const handleExport = () => {
        if (!activeSessionId || !sessions[activeSessionId]) return;
        const session = sessions[activeSessionId];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `ping_export_${session.host}_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSession = JSON.parse(e.target.result);
                const newId = `imported-${Date.now()}`;
                setSessions(prev => ({
                    ...prev,
                    [newId]: {
                        ...importedSession,
                        id: newId,
                        status: 'finished',
                        isReference: true,
                        color: '#9ca3af', // Gray for imported/reference
                        visible: true
                    }
                }));
                setComparisonSessionIds(prev => [...prev, newId]);
            } catch (err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    // --- Data Processing ---

    const activeSession = sessions[activeSessionId];
    const rawData = activeSession ? activeSession.data : [];
    const status = activeSession ? activeSession.status : 'idle';
    const logs = activeSession ? activeSession.logs : [];

    // 1. Filter data based on Brush (Active Session)
    const filteredData = useMemo(() => {
        if (brushRange.endIndex > 0 && brushRange.endIndex > brushRange.startIndex) {
            return rawData.slice(brushRange.startIndex, brushRange.endIndex + 1);
        }
        return rawData;
    }, [rawData, brushRange]);

    // 2. Calculate Derived Datasets (Active Session)
    // const stats = useMemo(() => calculateStats(filteredData), [filteredData]);
    // const histogramData = useMemo(() => calculateHistogram(filteredData, chartConfig.binSize), [filteredData, chartConfig.binSize]);
    // const cdfData = useMemo(() => calculateCDF(filteredData), [filteredData]);
    // const fftData = useMemo(() => calculateFFT(filteredData), [filteredData]);

    // Comparison Data Preparation
    const comparisonSeries = useMemo(() => {
        return comparisonSessionIds.map(id => {
            const s = sessions[id];
            if (!s) return null;

            // Handle packet loss: replace null latency with timeout value
            const processedData = s.data.map(d => ({
                ...d,
                latency: d.latency === null ? (s.config?.timeout || 1000) : d.latency
            }));

            return {
                id: s.id,
                name: (s.config?.host || s.host) + (s.isReference ? ' (Ref)' : ''),
                data: smoothData(processedData, chartConfig.smoothing, chartConfig.smoothing === 'ewma' ? chartConfig.smoothParam / 100 : chartConfig.smoothParam),
                color: s.color,
                stats: calculateStats(s.data), // Stats should probably still reflect real loss count, so use original data? Or processed? Usually stats want to know about loss count.
                cdfData: calculateCDF(processedData), // CDF should include timeout values? Usually yes for "max latency" visualization
                histogramData: calculateHistogram(processedData, chartConfig.binSize),
                fftData: calculateFFT(processedData)
            };
        }).filter(Boolean);
    }, [sessions, comparisonSessionIds, chartConfig.smoothing, chartConfig.smoothParam, chartConfig.binSize]);

    // Aggregate Histogram Data for Multi-Series BarChart
    const aggregatedHistogramData = useMemo(() => {
        if (comparisonSeries.length === 0) return [];

        // 1. Collect all unique ranges/binStarts from all series
        const allBins = new Set();
        comparisonSeries.forEach(series => {
            series.histogramData.forEach(bin => {
                allBins.add(bin.binStart);
            });
        });

        const sortedBinStarts = Array.from(allBins).sort((a, b) => a - b);

        // 2. Create unified data structure
        return sortedBinStarts.map(binStart => {
            const binLabel = `${binStart}-${binStart + chartConfig.binSize}ms`;
            const entry = { range: binLabel, binStart };
            comparisonSeries.forEach(series => {
                const matchingBin = series.histogramData.find(b => b.binStart === binStart);
                entry[series.id] = matchingBin ? matchingBin.count : 0;
            });
            return entry;
        });
    }, [comparisonSeries, chartConfig.binSize]);

    // Aggregate FFT Data for Multi-Series BarChart
    const aggregatedFFTData = useMemo(() => {
        if (comparisonSeries.length === 0) return [];

        // 1. Collect all unique frequencies
        // Note: Frequencies depend on sample rate and N. If N differs, frequencies differ.
        // For visualization, we might need to bin frequencies or assume they align if N is consistent (which it is, limited to 128).

        const allFreqs = new Set();
        comparisonSeries.forEach(series => {
            series.fftData.forEach(bin => {
                allFreqs.add(bin.frequency);
            });
        });

        const sortedFreqs = Array.from(allFreqs).sort((a, b) => parseFloat(a) - parseFloat(b));

        return sortedFreqs.map(freq => {
            const entry = { frequency: freq };
            comparisonSeries.forEach(series => {
                const matchingBin = series.fftData.find(b => b.frequency === freq);
                entry[series.id] = matchingBin ? matchingBin.magnitude : 0;
            });
            return entry;
        });
    }, [comparisonSeries]);

    const PingLogo = ({ color = "#f97316" }) => (
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="12" width="44" height="24" rx="6" stroke={color} strokeWidth="2.5" />
            <text x="24" y="28" textAnchor="middle" fill={color} fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">PING</text>
        </svg>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Top Bar */}
            <div className="bg-white dark:bg-gray-800 p-2 shadow-sm border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                {/* Row 1: Title & Global Controls */}
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <PingLogo />
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t('advancedPing')}</h1>
                        </div>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('monitor')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'monitor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <BarChart2 size={16} /> {t('monitor')}
                            </button>
                            <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <Sliders size={16} /> {t('config')}
                            </button>
                            <button onClick={() => setActiveTab('logs')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <FileText size={16} /> {t('logs')}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleExport} className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded" title="Export JSON">
                            <Download size={18} />
                        </button>
                        <label className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded cursor-pointer" title="Import JSON">
                            <Upload size={18} />
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-4">
                {activeTab === 'monitor' && (
                    <div className="h-full flex flex-col gap-4 overflow-hidden">

                        {/* 1. Stats (Top Row) */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-none overflow-x-auto">
                            {Object.keys(sessions).length > 0 ? (
                                // Comparison Table View
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2 w-10"><CheckSquare size={16} /></th>
                                            <th className="px-4 py-2">Target</th>
                                            <th className="px-4 py-2">Packets</th>
                                            <th className="px-4 py-2">Loss %</th>
                                            <th className="px-4 py-2">Min/Avg/Max</th>
                                            <th className="px-4 py-2">Jitter (Avg)</th>
                                            <th className="px-4 py-2">P90</th>
                                            <th className="px-4 py-2">P95</th>
                                            <th className="px-4 py-2">P99</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(sessions).map(s => {
                                            const isChecked = comparisonSessionIds.includes(s.id);
                                            const sStats = calculateStats(s.data);
                                            if (!sStats) return null;
                                            return (
                                                <tr key={s.id} className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 ${!isChecked ? 'opacity-50' : ''}`}>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => setComparisonSessionIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                                                        {s.config?.host || s.host} {s.isReference ? '(Ref)' : ''}
                                                    </td>
                                                    <td className="px-4 py-2">{sStats.count}</td>
                                                    <td className="px-4 py-2 text-red-500">{sStats.lossRate}%</td>
                                                    <td className="px-4 py-2">{sStats.min}/{sStats.mean}/{sStats.max}</td>
                                                    <td className="px-4 py-2">{sStats.jitter.mean}</td>
                                                    <td className="px-4 py-2">{sStats.p90}</td>
                                                    <td className="px-4 py-2">{sStats.p95}</td>
                                                    <td className="px-4 py-2">{sStats.p99}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                // Single View Grid (Fallback if no sessions selected, though we try to enforce selection)
                                <div className="flex items-center justify-center h-20 text-gray-500">
                                    No sessions. Add a target in Config tab.
                                </div>
                            )}
                        </div>

                        {/* 2. Time Series (Middle) */}
                        <div className="flex-[2] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-0 relative chart-settings-container">
                            <div className="flex justify-between items-center mb-2 z-10">
                                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <TrendingUp size={18} /> {t('timeSeries')}
                                </h3>

                                {/* Chart Settings Gear */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveSettingsMenu(activeSettingsMenu === 'timeSeries' ? null : 'timeSeries')}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        <Settings size={18} />
                                    </button>

                                    {/* Settings Popup */}
                                    {activeSettingsMenu === 'timeSeries' && (
                                        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 border-b pb-2 dark:border-gray-700">{t('chartSettings')}</h4>
                                            <div className="space-y-4 text-sm">
                                                {/* Smoothing */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-gray-600 dark:text-gray-300 flex items-center">
                                                            {t('smoothing')} <SimpleTooltip text={t('helpSmoothing')} />
                                                        </label>
                                                        <select
                                                            value={chartConfig.smoothing}
                                                            onChange={(e) => setChartConfig({ ...chartConfig, smoothing: e.target.value })}
                                                            className="p-1 text-xs border rounded dark:bg-gray-700 dark:text-white"
                                                        >
                                                            <option value="none">{t('raw')}</option>
                                                            <option value="sma">SMA</option>
                                                            <option value="ewma">EWMA</option>
                                                        </select>
                                                    </div>
                                                    {chartConfig.smoothing !== 'none' && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-500">{t('smoothParam')}:</span>
                                                            <input
                                                                type="range"
                                                                min="1"
                                                                max="100"
                                                                value={chartConfig.smoothParam}
                                                                onChange={(e) => setChartConfig({ ...chartConfig, smoothParam: Number(e.target.value) })}
                                                                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                                            />
                                                            <span className="text-xs w-6 text-right">{chartConfig.smoothParam}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Reference Line */}
                                                <div className="flex justify-between items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-300">
                                                        <input type="checkbox" checked={chartConfig.showRefLine} onChange={(e) => setChartConfig({ ...chartConfig, showRefLine: e.target.checked })} />
                                                        <span>{t('showRefLine')}</span>
                                                        <SimpleTooltip text={t('helpRefLine')} />
                                                    </label>
                                                    {chartConfig.showRefLine && (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={chartConfig.refLineValue}
                                                                onChange={(e) => setChartConfig({ ...chartConfig, refLineValue: Number(e.target.value) })}
                                                                className="w-12 p-1 text-xs text-center border rounded dark:bg-gray-700 dark:text-white"
                                                            />
                                                            <span className="text-xs text-gray-500">{t('ms')}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Color Gradient */}
                                                <div className="flex justify-between items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-300">
                                                        <input type="checkbox" checked={chartConfig.useColorGradient} onChange={(e) => setChartConfig({ ...chartConfig, useColorGradient: e.target.checked })} />
                                                        <span>{t('useColorGradient')}</span>
                                                        <SimpleTooltip text={t('helpGradient')} />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart>
                                        <defs>
                                            <linearGradient id="latencyGradient" x1="0" y1="1" x2="0" y2="0">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="50%" stopColor="#f59e0b" />
                                                <stop offset="100%" stopColor="#ef4444" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                        <XAxis dataKey="index" type="number" hide={true} domain={['dataMin', 'dataMax']} />
                                        <YAxis label={{ value: t('ms'), angle: -90, position: 'insideLeft' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#9ca3af' }}
                                        />
                                        <Legend />
                                        {chartConfig.showRefLine && (
                                            <ReferenceLine y={chartConfig.refLineValue} stroke="red" strokeDasharray="3 3" label={t('threshold')} />
                                        )}

                                        {/* Render all selected sessions */}
                                        {comparisonSeries.map(series => (
                                            <Line
                                                key={series.id}
                                                data={series.data}
                                                type="monotone"
                                                dataKey="latency"
                                                stroke={comparisonSeries.length === 1 && chartConfig.useColorGradient ? "url(#latencyGradient)" : series.color}
                                                strokeWidth={2}
                                                strokeOpacity={0.8}
                                                dot={false}
                                                name={series.name}
                                                isAnimationActive={false}
                                            />
                                        ))}

                                        <Brush
                                            data={comparisonSeries.length > 0 ? comparisonSeries[0].data : []}
                                            dataKey="index"
                                            height={30}
                                            stroke="#8884d8"
                                            onChange={(range) => {
                                                if (range && range.startIndex !== undefined) {
                                                    setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                                                }
                                            }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Bottom Charts (Grid of 3) */}
                        <div className="flex-[1.5] grid grid-cols-3 gap-4 min-h-[200px]">
                            {/* Histogram */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative chart-settings-container">
                                <div className="flex justify-between items-center mb-1 z-10">
                                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t('distribution')}</h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveSettingsMenu(activeSettingsMenu === 'hist' ? null : 'hist')}
                                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        {activeSettingsMenu === 'hist' && (
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                                                <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-3 border-b pb-2 dark:border-gray-700">Histogram Settings</h4>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-gray-600 dark:text-gray-300 flex items-center text-xs">
                                                        {t('binSize')} <SimpleTooltip text={t('helpBinSize')} />
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={chartConfig.binSize}
                                                            onChange={(e) => setChartConfig({ ...chartConfig, binSize: Math.max(1, Number(e.target.value)) })}
                                                            className="w-12 p-1 text-xs text-center border rounded dark:bg-gray-700 dark:text-white"
                                                        />
                                                        <span className="text-xs text-gray-500">{t('ms')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={aggregatedHistogramData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                            <YAxis tick={{ fontSize: 9 }} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Legend />
                                            {comparisonSeries.map((s) => (
                                                <Bar
                                                    key={s.id}
                                                    dataKey={s.id}
                                                    fill={s.color}
                                                    name={s.name}
                                                    stackId={comparisonSeries.length > 1 ? undefined : "a"}
                                                    opacity={0.7}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* CDF */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative chart-settings-container">
                                <div className="flex justify-between items-center mb-1 z-10">
                                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t('cdf')}</h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveSettingsMenu(activeSettingsMenu === 'cdf' ? null : 'cdf')}
                                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        {activeSettingsMenu === 'cdf' && (
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                                                <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-3 border-b pb-2 dark:border-gray-700">CDF Settings</h4>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-gray-600 dark:text-gray-300 flex items-center text-xs">
                                                        {t('cdfType')} <SimpleTooltip text={t('helpCdfType')} />
                                                    </label>
                                                    <select
                                                        value={chartConfig.cdfType}
                                                        onChange={(e) => setChartConfig({ ...chartConfig, cdfType: e.target.value })}
                                                        className="p-1 text-xs border rounded dark:bg-gray-700 dark:text-white"
                                                    >
                                                        <option value="step">{t('step')}</option>
                                                        <option value="monotone">{t('curve')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="latency" type="number" domain={['auto', 'auto']} tick={{ fontSize: 9 }} name="Latency" unit="ms" allowDuplicatedCategory={false} />
                                            <YAxis dataKey="probability" type="number" domain={[0, 100]} tick={{ fontSize: 9 }} name="Probability" unit="%" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Legend />
                                            {comparisonSeries.map((s) => (
                                                <Line
                                                    key={s.id}
                                                    name={s.name}
                                                    data={s.cdfData}
                                                    dataKey="probability"
                                                    stroke={s.color || '#9ca3af'}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    type={chartConfig.cdfType === 'step' ? 'stepAfter' : 'monotone'}
                                                    isAnimationActive={false}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* FFT */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative chart-settings-container">
                                <div className="flex justify-between items-center mb-1 z-10">
                                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t('fft')}</h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveSettingsMenu(activeSettingsMenu === 'fft' ? null : 'fft')}
                                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        {activeSettingsMenu === 'fft' && (
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                                                <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-3 border-b pb-2 dark:border-gray-700">FFT Settings</h4>
                                                <div className="text-xs text-gray-500">No settings available yet.</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={aggregatedFFTData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="frequency" tick={{ fontSize: 9 }} label={{ value: t('hz'), position: 'insideBottomRight', fontSize: 9 }} />
                                            <YAxis tick={{ fontSize: 9 }} />
                                            <Tooltip />
                                            <Legend />
                                            {comparisonSeries.map((s) => (
                                                <Bar
                                                    key={s.id}
                                                    dataKey={s.id}
                                                    fill={s.color}
                                                    name={s.name}
                                                    opacity={0.7}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <List size={20} /> Session Manager
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleStartSelected}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-700 flex items-center gap-2"
                                    title="Start all checked sessions"
                                >
                                    <Play size={16} /> Start Selected
                                </button>
                                <button
                                    onClick={handleStopSelected}
                                    className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700 flex items-center gap-2"
                                    title="Stop all checked sessions"
                                >
                                    <SquareIcon size={16} /> Stop Selected
                                </button>
                                <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                <button
                                    onClick={handleAddSession}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add Target
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 w-10">
                                            <CheckSquare size={16} />
                                        </th>
                                        <th className="px-4 py-3">Target Host</th>
                                        <th className="px-4 py-3">Config (Size / TTL / Timeout)</th>
                                        <th className="px-4 py-3">Flags (-n / -f / -a / IP)</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {Object.values(sessions).map(s => (
                                        <tr
                                            key={s.id}
                                            className={`transition-colors cursor-pointer ${activeSessionId === s.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                            onClick={() => setActiveSessionId(s.id)}
                                        >
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={comparisonSessionIds.includes(s.id)}
                                                        onChange={() => setComparisonSessionIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={s.config?.host || s.host}
                                                    onChange={(e) => setSessions(prev => ({
                                                        ...prev,
                                                        [s.id]: { ...prev[s.id], host: e.target.value, config: { ...prev[s.id].config, host: e.target.value } }
                                                    }))}
                                                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-0.5 transition-colors font-mono text-gray-900 dark:text-white"
                                                    disabled={s.status === 'running' || s.isReference}
                                                />
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1" title="Packet Size">
                                                        <span className="text-xs text-gray-400">S:</span>
                                                        <input
                                                            type="number"
                                                            value={s.config?.size || 32}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, size: parseInt(e.target.value) } }
                                                            }))}
                                                            className="w-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-center"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1" title="TTL">
                                                        <span className="text-xs text-gray-400">T:</span>
                                                        <input
                                                            type="number"
                                                            value={s.config?.ttl || 128}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, ttl: parseInt(e.target.value) } }
                                                            }))}
                                                            className="w-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-center"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Timeout">
                                                        <span className="text-xs text-gray-400">TO:</span>
                                                        <input
                                                            type="number"
                                                            value={s.config?.timeout || 1000}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, timeout: parseInt(e.target.value) } }
                                                            }))}
                                                            className="w-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-center"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1" title="Count (0=Inf)">
                                                        <span className="text-xs text-gray-400">-n:</span>
                                                        <input
                                                            type="number"
                                                            value={s.config?.count || 0}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, count: parseInt(e.target.value) } }
                                                            }))}
                                                            className="w-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-center"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                    </div>
                                                    <label className="flex items-center gap-1 cursor-pointer" title="Don't Fragment">
                                                        <input
                                                            type="checkbox"
                                                            checked={s.config?.fragment || false}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, fragment: e.target.checked } }
                                                            }))}
                                                            className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                        <span className="text-xs text-gray-500">-f</span>
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer" title="Resolve Hostname">
                                                        <input
                                                            type="checkbox"
                                                            checked={s.config?.resolve || false}
                                                            onChange={(e) => setSessions(prev => ({
                                                                ...prev,
                                                                [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, resolve: e.target.checked } }
                                                            }))}
                                                            className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                            disabled={s.status === 'running' || s.isReference}
                                                        />
                                                        <span className="text-xs text-gray-500">-a</span>
                                                    </label>
                                                    <select
                                                        value={s.config?.ipVersion || 'auto'}
                                                        onChange={(e) => setSessions(prev => ({
                                                            ...prev,
                                                            [s.id]: { ...prev[s.id], config: { ...prev[s.id].config, ipVersion: e.target.value } }
                                                        }))}
                                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-xs"
                                                        disabled={s.status === 'running' || s.isReference}
                                                    >
                                                        <option value="auto">Auto</option>
                                                        <option value="4">v4</option>
                                                        <option value="6">v6</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        s.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {s.status === 'running' && <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                                                    {s.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    {s.status === 'running' ? (
                                                        <button
                                                            onClick={() => handleStop(s.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Stop"
                                                        >
                                                            <SquareIcon size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStart(s.id)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                                            title="Start"
                                                            disabled={s.isReference}
                                                        >
                                                            <Play size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteSession(s.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="h-full bg-black text-green-400 p-4 rounded-xl font-mono text-sm overflow-auto shadow-inner">
                        {logs.length === 0 && <div className="text-gray-500 italic">No logs yet...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="whitespace-pre-wrap border-b border-gray-900 pb-1 mb-1">{log}</div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdvancedPingPanel;
