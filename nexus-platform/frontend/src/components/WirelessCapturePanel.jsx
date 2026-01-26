import React, { useState, useEffect, useCallback, Component } from 'react';
import {
    Play, Square, Wifi, Settings, RefreshCw, Radio,
    Activity, Filter, Save, Globe, Server, Laptop, Terminal,
    Shield, Network, Plus, Loader2, AlertTriangle
} from 'lucide-react';
import AddHostModal from './AddHostModal';

// --- Error Boundary ---
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("WirelessCapturePanel Error:", error, errorInfo);
        // Log to backend if possible
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.log_message('ERROR', `UI Crash: ${error.toString()}`, 'WirelessCapturePanel');
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 text-red-900 rounded-lg border border-red-200 m-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-6 h-6" />
                        Something went wrong.
                    </h2>
                    <p className="font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-auto whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Try to Recover
                    </button>
                    <p className="mt-4 text-xs text-red-600">Please check logs/app.log for details.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const WirelessCapturePanelContent = ({
    config = {},
    setConfig = () => { },
    status = { state: 'idle', duration: 0, size: '0 B' },
    onStart = () => { },
    onStop = () => { }
}) => {

    // Ensure config has default internal structure if empty
    const safeConfig = {
        target: '',
        ssh_user: '',
        ssh_pass: '',
        host_id: '',
        selected_iface: null,
        channel: '1',
        bandwidth: '20',
        filter: '',
        output_name: '',
        duration: 0,
        packet_limit: 0,
        ...config
    };

    // Safe Update Wrapper
    const updateConfig = (updates) => {
        setConfig({ ...safeConfig, ...updates });
    };

    // Local state for interface scanning
    const [interfaces, setInterfaces] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('interfaces'); // interfaces | wireless | capture

    // UI State for SSH management
    const [mode, setMode] = useState('local'); // local | ssh
    const [showAddHost, setShowAddHost] = useState(false);
    const [sshHosts, setSshHosts] = useState([]);

    // Load SSH hosts on mount
    useEffect(() => {
        const loadHosts = async () => {
            if (window.pywebview) {
                try {
                    const hosts = await window.pywebview.api.capture_get_hosts();
                    setSshHosts(hosts || []);
                } catch (e) {
                    console.error("Failed to load SSH hosts", e);
                    // Fallback
                    const stored = localStorage.getItem('nexus_ssh_hosts');
                    if (stored) setSshHosts(JSON.parse(stored));
                }
            }
        };
        loadHosts();
    }, []);

    const handleSaveHost = async (newHost) => {
        const hostData = { ...newHost, id: newHost.id || Date.now().toString() };

        if (window.pywebview) {
            try {
                const updated = await window.pywebview.api.capture_save_host(hostData);
                setSshHosts(updated);
            } catch (e) {
                console.error("Failed to save host to backend", e);
                // Fallback
                const updated = [...sshHosts.filter(h => h.ip !== hostData.ip), hostData];
                setSshHosts(updated);
                localStorage.setItem('nexus_ssh_hosts', JSON.stringify(updated));
            }
        } else {
            // Dev mode fallback
            const updated = [...sshHosts, hostData];
            setSshHosts(updated);
            localStorage.setItem('nexus_ssh_hosts', JSON.stringify(updated));
        }
        setShowAddHost(false);
    };

    // Poll for interfaces when tab is active
    const refreshInterfaces = useCallback(async () => {
        if (!window.pywebview) return;
        setIsScanning(true);
        try {
            // Pass auth config if in SSH mode
            const scanConfig = mode === 'ssh' ? {
                mode: 'ssh',
                target: safeConfig.target,
                ssh_user: safeConfig.ssh_user || '',
                ssh_pass: safeConfig.ssh_pass || ''
            } : { mode: 'local' };

            // FIX: Using correct API method name (capture_list_interfaces)
            const ifaces = await window.pywebview.api.capture_list_interfaces(scanConfig);
            setInterfaces(ifaces || []);
        } catch (err) {
            console.error("Failed to list interfaces:", err);
            if (window.pywebview) {
                window.pywebview.api.log_message('ERROR', `Failed to list interfaces: ${err.toString()}`, 'WirelessCapturePanel');
            }
            // Mock data for dev
            if (process.env.NODE_ENV === 'development') {
                setInterfaces([
                    { name: 'eth0', type: 'ethernet', ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:FF' },
                    { name: 'wlan0', type: 'wireless', driver: 'iwlwifi', mode: 'managed', ip: '10.0.0.5', mac: '11:22:33:44:55:66' },
                    { name: 'wlan1', type: 'wireless', driver: 'ath9k_htc', mode: 'monitor', ip: '', mac: '77:88:99:AA:BB:CC' }
                ]);
            }
        } finally {
            setIsScanning(false);
        }
    }, [mode, safeConfig.target, safeConfig.ssh_user, safeConfig.ssh_pass]);

    // Initial fetch removed to prevent auto-scan
    // useEffect(() => {
    //     refreshInterfaces();
    // }, []);

    const handleSelectInterface = (iface) => {
        updateConfig({ selected_iface: iface });
    };

    const handleSetMode = async (modeName) => {
        if (!safeConfig.selected_iface) return;
        try {
            if (window.pywebview) {
                // FIX: Using correct API method name (capture_set_mode)
                await window.pywebview.api.capture_set_mode({
                    iface: safeConfig.selected_iface.name,
                    mode: modeName
                });
                refreshInterfaces(); // Refresh to see change
            }
        } catch (err) {
            console.error("Failed to set mode:", err);
            if (window.pywebview) window.pywebview.api.log_message('ERROR', `Set mode failed: ${err}`, 'WirelessCapturePanel');
        }
    };

    const handleSetChannel = async () => {
        if (!safeConfig.selected_iface) return;
        try {
            if (window.pywebview) {
                // FIX: Using correct API method name (capture_set_channel)
                await window.pywebview.api.capture_set_channel({
                    iface: safeConfig.selected_iface.name,
                    channel: parseInt(safeConfig.channel),
                    width: safeConfig.bandwidth
                });
            }
        } catch (err) {
            console.error("Failed to set channel:", err);
            if (window.pywebview) window.pywebview.api.log_message('ERROR', `Set channel failed: ${err}`, 'WirelessCapturePanel');
        }
    };

    // Wifi Connection State
    const [wifiConfig, setWifiConfig] = useState({ ssid: '', password: '' });
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectWifi = async (e) => {
        e.preventDefault();
        if (!safeConfig.selected_iface) return;
        setIsConnecting(true);
        try {
            if (window.pywebview) {
                // FIX: Using correct API method name (capture_connect_wifi)
                await window.pywebview.api.capture_connect_wifi({
                    iface: safeConfig.selected_iface.name,
                    ssid: wifiConfig.ssid,
                    password: wifiConfig.password
                });
                refreshInterfaces();
            }
        } catch (err) {
            console.error("WiFi Connect failed", err);
            if (window.pywebview) window.pywebview.api.log_message('ERROR', `WiFi connect failed: ${err}`, 'WirelessCapturePanel');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleStart = () => {
        onStart();
    };

    const handleStop = async () => {
        onStop(); // Notify parent
        if (window.pywebview) {
            await window.pywebview.api.capture_stop();
        }
    };

    const isCapturing = status.state === 'capturing' || status.state === 'starting';

    // Helper to check if wireless
    const isWireless = (iface) => {
        if (!iface) return false;
        const type = (iface.type || '').toLowerCase();
        return type === 'wireless' || type === 'wi-fi' || type === 'wifi';
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">

            {/* 1. Header Bar (Advanced Ping Style) */}
            <div className="bg-white dark:bg-gray-800 px-6 py-3 shadow-sm border-b dark:border-gray-700 flex items-center gap-6 shrink-0">
                {/* Logo Area */}
                <div className="flex items-center gap-2 select-none">
                    <div className="bg-orange-100 p-1.5 rounded-lg">
                        <Activity className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Wireless-Capture</span>
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Tabs (Pill Style) */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    {[
                        { id: 'interfaces', label: 'Interfaces', icon: Network },
                        { id: 'wireless', label: 'Wireless Config', icon: Wifi },
                        { id: 'capture', label: 'Capture Control', icon: Radio }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">

                    {/* TAB 1: INTERFACES */}
                    {activeTab === 'interfaces' && (
                        <div className="flex flex-col gap-6 h-full">
                            {/* Interface Control Panel (Moved here) */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5 shrink-0 flex flex-col gap-4">
                                {/* Row 1: Source Mode Switch */}
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg self-start">
                                    <button
                                        onClick={() => { setMode('local'); setInterfaces([]); }}
                                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'local'
                                            ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <Laptop className="w-4 h-4" />
                                        Local
                                    </button>
                                    <button
                                        onClick={() => { setMode('ssh'); setInterfaces([]); }}
                                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'ssh'
                                            ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <Terminal className="w-4 h-4" />
                                        Remote (SSH)
                                    </button>
                                </div>

                                {mode === 'ssh' && (
                                    <>
                                        {/* Row 2: Target Host & Action */}
                                        <div className="flex items-start gap-4 flex-wrap">
                                            <div className="flex-1 min-w-[300px]">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Host</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        className="flex-1 bg-gray-50 dark:bg-gray-900 border-none text-sm rounded-lg focus:ring-1 focus:ring-blue-500 py-2.5 pl-3 pr-8"
                                                        value={safeConfig.host_id || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (!val) {
                                                                updateConfig({ host_id: '', target: '', ssh_user: '', ssh_pass: '' });
                                                                return;
                                                            }
                                                            // Ensure strict string comparison
                                                            const host = sshHosts.find(h => String(h.id || h.ip) === String(val));
                                                            if (host) {
                                                                // Force update even if React batching is weird
                                                                setTimeout(() => {
                                                                    updateConfig({
                                                                        host_id: String(host.id || host.ip),
                                                                        target: host.ip,
                                                                        ssh_user: host.user,
                                                                        ssh_pass: host.pass
                                                                    });
                                                                }, 0);
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Select Host</option>
                                                        {sshHosts.map(h => {
                                                            const val = String(h.id || h.ip);
                                                            const displayAlias = h.alias || h.description || h.ip;
                                                            return (
                                                                <option key={val} value={val}>
                                                                    {displayAlias !== h.ip ? `${displayAlias} (${h.ip})` : h.ip}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    <button
                                                        onClick={() => setShowAddHost(true)}
                                                        className="px-3 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors border dark:border-gray-700"
                                                        title="Add/Manage Host"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Quick Connect (Revised Layout) */}
                                        <div className="w-full">
                                            <div className="flex gap-4">
                                                {/* IP Address */}
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target IP</label>
                                                    <div className="relative group bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg">
                                                        <div className="absolute left-3 top-2.5 pointer-events-none">
                                                            <Server className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="text" placeholder="192.168.1.1"
                                                            className="w-full pl-10 pr-3 py-2 border-none bg-transparent text-sm font-mono focus:ring-1 focus:ring-blue-500 rounded-lg"
                                                            value={safeConfig.target || ''}
                                                            onChange={e => updateConfig({ target: e.target.value, host_id: '' })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 mt-3">
                                                {/* Username */}
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">SSH User</label>
                                                    <input
                                                        type="text"
                                                        placeholder="root"
                                                        autoComplete="off"
                                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white text-gray-900 focus:ring-1 focus:ring-blue-500"
                                                        value={safeConfig.ssh_user || ''}
                                                        onChange={e => updateConfig({ ssh_user: e.target.value, host_id: '' })}
                                                    />
                                                </div>

                                                {/* Password */}
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">SSH Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        value={safeConfig.ssh_pass || ''}
                                                        onChange={e => updateConfig({ ssh_pass: e.target.value, host_id: '' })}
                                                        placeholder="Password"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Row 4: Action Button */}
                                <div className="self-end mt-2">
                                    <button
                                        onClick={refreshInterfaces}
                                        disabled={isScanning}
                                        className={`h-[42px] px-8 rounded-lg text-white shadow-md transition-all flex items-center gap-2 font-medium ${isScanning
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95'
                                            }`}
                                    >
                                        {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        {isScanning ? 'Connecting...' : 'Connect & Fetch'}
                                    </button>
                                </div>
                            </div>

                            {/* Interfaces List */}
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col overflow-hidden">
                                <div className="px-5 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Network Interfaces</h3>
                                    <span className="text-xs text-gray-400">{interfaces.length} found</span>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700 sticky top-0 z-10">

                                            <tr>
                                                <th className="px-4 py-3 font-medium text-gray-500 w-10">Use</th>
                                                <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                                                <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                                                <th className="px-4 py-3 font-medium text-gray-500">Driver/Chipset</th>
                                                <th className="px-4 py-3 font-medium text-gray-500">Mode</th>
                                                <th className="px-4 py-3 font-medium text-gray-500">IP/MAC</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-700">
                                            {interfaces.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                                        No interfaces found. Click "Connect & Fetch" above.
                                                    </td>
                                                </tr>
                                            ) : (
                                                interfaces.map((iface, idx) => {
                                                    const isSelected = safeConfig.selected_iface && safeConfig.selected_iface.name === iface.name;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => handleSelectInterface(iface)}
                                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="radio"
                                                                    checked={isSelected}
                                                                    onChange={() => handleSelectInterface(iface)}
                                                                    className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 font-medium">{iface.name}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded text-xs select-none ${isWireless(iface) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                    {iface.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs max-w-[150px] truncate" title={iface.driver}>{iface.driver || '-'}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded text-xs uppercase select-none ${iface.mode === 'monitor' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {iface.mode || 'managed'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                                                                <div>{iface.ip}</div>
                                                                <div className="opacity-70">{iface.mac}</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Interface Footer Actions */}
                                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                                    <button
                                        onClick={refreshInterfaces}
                                        disabled={isScanning}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                    >
                                        {isScanning ? 'Scanning...' : 'Refresh List'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* TAB 2: WIRELESS CONFIG */}
                    {activeTab === 'wireless' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {!safeConfig.selected_iface ? (
                                <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-dashed">
                                    Please select an interface from the "Interfaces" tab first.
                                </div>
                            ) : (
                                <>
                                    {/* Card 1: Radio Mode */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
                                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-purple-500" />
                                            Operation Mode
                                        </h3>
                                        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <button
                                                onClick={() => handleSetMode('managed')}
                                                disabled={safeConfig.selected_iface?.mode === 'managed'}
                                                className={`flex-1 py-3 px-4 rounded border flex flex-col items-center gap-2 transition-all ${safeConfig.selected_iface?.mode === 'managed'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
                                                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                <Wifi className="w-6 h-6" />
                                                <span className="font-bold">Managed Mode</span>
                                                <span className="text-xs opacity-75">Connect to APs (Client)</span>
                                            </button>

                                            <button
                                                onClick={() => handleSetMode('monitor')}
                                                disabled={safeConfig.selected_iface?.mode === 'monitor'}
                                                className={`flex-1 py-3 px-4 rounded border flex flex-col items-center gap-2 transition-all ${safeConfig.selected_iface?.mode === 'monitor'
                                                    ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500 ring-offset-2'
                                                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                <Activity className="w-6 h-6" />
                                                <span className="font-bold">Monitor Mode</span>
                                                <span className="text-xs opacity-75">Passive Capture Only</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card 2: Radio Parameters */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
                                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                            <Settings className="w-5 h-5 text-gray-500" />
                                            Radio Parameters
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-gray-500 mb-1">Channel</label>
                                                <select
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    value={safeConfig.channel}
                                                    onChange={(e) => updateConfig({ channel: e.target.value })}
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 36, 40, 44, 48, 149, 153, 157, 161, 165].map(c => (
                                                        <option key={c} value={c}>Channel {c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-500 mb-1">Bandwidth</label>
                                                <select
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    value={safeConfig.bandwidth}
                                                    onChange={(e) => updateConfig({ bandwidth: e.target.value })}
                                                >
                                                    <option value="20">20 MHz</option>
                                                    <option value="40">40 MHz</option>
                                                    <option value="80">80 MHz</option>
                                                    <option value="160">160 MHz</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end mt-4">
                                            <button
                                                onClick={handleSetChannel}
                                                className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700"
                                            >
                                                Apply Settings
                                            </button>
                                        </div>
                                    </div>

                                    {/* Network Connection (WiFi) */}
                                    {safeConfig.selected_iface?.mode !== 'monitor' && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
                                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-blue-500" />
                                                Network Connection
                                            </h3>
                                            <form onSubmit={handleConnectWifi} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">SSID</label>
                                                        <div className="relative">
                                                            <Wifi className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                value={wifiConfig.ssid}
                                                                onChange={(e) => setWifiConfig({ ...wifiConfig, ssid: e.target.value })}
                                                                placeholder="Network Name"
                                                                className="pl-9 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Password</label>
                                                        <div className="relative">
                                                            <Shield className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                            <input
                                                                type="password"
                                                                value={wifiConfig.password}
                                                                onChange={(e) => setWifiConfig({ ...wifiConfig, password: e.target.value })}
                                                                placeholder="WPA2 Key"
                                                                className="pl-9 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={isConnecting}
                                                        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                                                        {isConnecting ? 'Connecting...' : 'Connect to Network'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB 3: CAPTURE CONTROL */}
                    {activeTab === 'capture' && (
                        <div className="space-y-6 max-w-4xl mx-auto pb-8">
                            {!safeConfig.selected_iface ? (
                                <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-dashed">
                                    Please select an interface from the "Interfaces" tab first.
                                </div>
                            ) : (
                                <>
                                    {/* Section 1: Configuration */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 space-y-4">
                                        <h3 className="font-bold border-b pb-2 mb-4 flex items-center gap-2">
                                            <Filter className="w-4 h-4" />
                                            Capture Configuration
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Capture Filter (BPF Syntax)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-gray-400 font-mono text-xs">BPF &gt;</span>
                                                    <input
                                                        type="text"
                                                        value={safeConfig.filter}
                                                        onChange={(e) => updateConfig({ filter: e.target.value })}
                                                        placeholder="tcp port 80"
                                                        className="pl-12 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Leave empty to capture all traffic.</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Filename Text (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={safeConfig.output_name}
                                                    onChange={(e) => updateConfig({ output_name: e.target.value })}
                                                    placeholder="e.g. Test-Case-01"
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Will produce: <code>YYYYMMDDHHMMSS-Test-Case-01.pcap</code></p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Duration (sec)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={safeConfig.duration}
                                                        onChange={(e) => updateConfig({ duration: parseInt(e.target.value) || 0 })}
                                                        placeholder="0 (Unlimited)"
                                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Packet Limit
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={safeConfig.packet_limit || 0}
                                                        onChange={(e) => updateConfig({ packet_limit: parseInt(e.target.value) || 0 })}
                                                        placeholder="0 (Unlimited)"
                                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Actions & Status */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center gap-6">

                                        {status.state === 'idle' || status.state === 'finished' ? (
                                            <div className="w-full flex justify-end">
                                                <button
                                                    onClick={handleStart}
                                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-transform active:scale-95 flex items-center gap-3 font-bold"
                                                >
                                                    <Play className="w-5 h-5 fill-current" />
                                                    START CAPTURE
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full flex items-center justify-between gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="relative flex h-3 w-3">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                        </span>
                                                        <span className="font-bold text-green-700 dark:text-green-400">Capturing in progress...</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono pl-5">
                                                        Duration: {status.duration}s | Size: {status.size}
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden mt-2">
                                                        <div className="bg-blue-500 h-1.5 rounded-full animate-progress-indeterminate"></div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleStop}
                                                    className="px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg shadow-sm transition-colors flex items-center gap-2 font-bold whitespace-nowrap"
                                                >
                                                    <Square className="w-4 h-4 fill-current" />
                                                    STOP
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AddHostModal
                isOpen={showAddHost}
                onClose={() => setShowAddHost(false)}
                onSave={handleSaveHost}
            />
        </div>
    );
};

// Smart Controller Wrapper to provide state when used in isolation
const WirelessCapturePanel = (props) => {
    // 1. State Management
    const [config, setConfig] = useState(props.config || {
        target: '',
        ssh_user: '',
        ssh_pass: '',
        host_id: '',
        selected_iface: null,
        channel: '1',
        bandwidth: '20',
        filter: '',
        output_name: '',
        duration: 0,
        packet_limit: 0
    });

    // Merge props into state if they exist (Simple sync)
    useEffect(() => {
        if (props.config) setConfig(prev => ({ ...prev, ...props.config }));
    }, [props.config]);

    const [status, setStatus] = useState({ state: 'idle', duration: 0, size: '0 B' });

    // 2. Status Polling
    useEffect(() => {
        let interval;
        if (status.state === 'capturing' || status.state === 'starting') {
            interval = setInterval(async () => {
                if (window.pywebview) {
                    try {
                        const s = await window.pywebview.api.capture_get_status();
                        if (s) setStatus(s);
                        if (s && s.state === 'finished') clearInterval(interval);
                    } catch (e) { console.error("Poll failed", e); }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status.state]);

    // 3. Handlers
    const handleStart = async () => {
        setStatus(prev => ({ ...prev, state: 'starting' }));
        try {
            if (window.pywebview) {
                // Ensure correct types for backend
                const apiConfig = {
                    ...config,
                    channel: parseInt(config.channel) || 1,
                    duration: parseInt(config.duration) || 0,
                    packet_limit: parseInt(config.packet_limit) || 0,
                    iface: config.selected_iface?.name
                };
                await window.pywebview.api.capture_start(apiConfig);
            }
            setStatus(prev => ({ ...prev, state: 'capturing' }));
        } catch (e) {
            console.error("Start failed", e);
            setStatus({ state: 'idle', duration: 0, size: '0 B', error: e.toString() });
        }
    };

    const handleStop = async () => {
        if (window.pywebview) await window.pywebview.api.capture_stop();
        setStatus(prev => ({ ...prev, state: 'finished' }));
    };

    return (
        <ErrorBoundary>
            <WirelessCapturePanelContent
                config={config}
                setConfig={setConfig}
                status={status}
                onStart={handleStart}
                onStop={handleStop}
            />
        </ErrorBoundary>
    );
};

export default WirelessCapturePanel;