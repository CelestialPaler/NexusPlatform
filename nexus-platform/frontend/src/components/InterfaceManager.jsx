import React, { useState } from 'react';
import { Wifi, Router, Activity, Lock, Unlock, Link2, Link2Off, Loader2 } from 'lucide-react';

const InterfaceManager = ({ config, onRefresh }) => {
    const [mode, setMode] = useState('managed'); // view state, not actual device state until refreshed
    const [isSwitching, setIsSwitching] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectStatus, setConnectStatus] = useState('disconnected'); // disconnected, connecting, connected

    // Wifi Config
    const [ssid, setSsid] = useState('');
    const [wifiPass, setWifiPass] = useState('');

    const handleSwitchMode = async (targetMode) => {
        if (!config.remote_iface) return;
        setIsSwitching(true);
        if (window.pywebview) {
            try {
                const res = await window.pywebview.api.capture_set_mode({
                    target: config.target,
                    ssh_user: config.ssh_user,
                    ssh_pass: config.ssh_pass,
                    interface: config.remote_iface,
                    mode: targetMode
                });
                if (res.status === 'success') {
                    setMode(targetMode); // Ideally re-scan interfaces here
                    if (onRefresh) onRefresh();
                } else {
                    alert("Switch Error: " + res.message);
                }
            } catch (e) {
                alert("RPC Error: " + e);
            }
        }
        setIsSwitching(false);
    };

    const handleConnect = async () => {
        if (connectStatus === 'connected') return; // Should be disconnect logic

        setIsConnecting(true);
        setConnectStatus('connecting');

        if (window.pywebview) {
            try {
                const res = await window.pywebview.api.capture_connect_wifi({
                    target: config.target,
                    ssh_user: config.ssh_user,
                    ssh_pass: config.ssh_pass,
                    interface: config.remote_iface,
                    ssid: ssid,
                    wifi_password: wifiPass
                });

                if (res.status === 'success') {
                    setConnectStatus('connected');
                } else {
                    setConnectStatus('disconnected');
                    alert("Connection Failed: " + res.message);
                }
            } catch (e) {
                setConnectStatus('disconnected');
                alert(e);
            }
        }
        setIsConnecting(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Router className="w-4 h-4 text-purple-500" /> Interface Manager: <span className="font-mono text-blue-500">{config.remote_iface || 'None'}</span>
            </h3>

            {!config.remote_iface ? (
                <div className="text-xs text-gray-400 italic">Please select a remote interface first.</div>
            ) : (
                <div className="space-y-4">
                    {/* Mode Switcher */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        <button
                            onClick={() => handleSwitchMode('managed')}
                            disabled={isSwitching}
                            className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-2 ${mode === 'managed' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            {isSwitching && mode !== 'managed' ? <Loader2 className="animate-spin w-3 h-3" /> : <Wifi className="w-3 h-3" />} Managed (Station)
                        </button>
                        <button
                            onClick={() => handleSwitchMode('monitor')}
                            disabled={isSwitching}
                            className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-2 ${mode === 'monitor' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}
                        >
                            {isSwitching && mode !== 'monitor' ? <Loader2 className="animate-spin w-3 h-3" /> : <Activity className="w-3 h-3" />} Monitor (Sniffer)
                        </button>
                    </div>

                    {/* Mode Specific Controls */}
                    {mode === 'monitor' ? (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-900/50 text-xs text-orange-700 dark:text-orange-300">
                            <p className="flex items-center gap-2"><Lock className="w-3 h-3" /> Interface is in Monitor Mode.</p>
                            <p className="mt-1 opacity-75">Ready to capture raw 802.11 frames. Use the "Capture" panel to start.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">SSID</label>
                                    <input
                                        type="text"
                                        value={ssid}
                                        onChange={e => setSsid(e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="My_WiFi"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Passphrase</label>
                                    <input
                                        type="password"
                                        value={wifiPass}
                                        onChange={e => setWifiPass(e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="*******"
                                    />
                                    {/* <label className="flex items-center gap-2 mt-1">
                                        <input type="checkbox" className="rounded text-blue-500"/>
                                        <span className="text-xs text-gray-500">Auto-Connect</span>
                                    </label> */}
                                </div>
                            </div>

                            {connectStatus === 'disconnected' && (
                                <button
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                    className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
                                >
                                    {isConnecting ? <Loader2 className="animate-spin w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                                    Connect
                                </button>
                            )}

                            {connectStatus === 'connecting' && (
                                <button disabled className="w-full py-2 bg-blue-500 text-white rounded text-xs font-medium flex items-center justify-center gap-2 cursor-wait">
                                    <Loader2 className="animate-spin w-3 h-3" /> Connecting to {ssid}...
                                </button>
                            )}

                            {connectStatus === 'connected' && (
                                <button
                                    onClick={() => setConnectStatus('disconnected')} // Placeholder for disconnect
                                    className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                                >
                                    <Link2Off className="w-3 h-3" /> Disconnect
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InterfaceManager;
