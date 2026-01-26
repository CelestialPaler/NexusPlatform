import React, { useState } from 'react';
import { Cpu, Network, Activity, BarChart2, Settings, ExternalLink, X, Wifi, Ear } from 'lucide-react';
import ConfirmModal from './common/ConfirmModal';
import Button from './common/Button';

const RtpLogo = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="12" width="44" height="24" rx="6" stroke="#EF4444" strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">RTP</text>
    </svg>
);

const BaLogo = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="12" width="44" height="24" rx="6" stroke="#8B5CF6" strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">BA</text>
    </svg>
);

const PingLogo = ({ color = "#22c55e" }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="12" width="44" height="24" rx="6" stroke={color} strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">PING</text>
    </svg>
);

const ToolsPanel = ({ t, onSelectTool }) => {
    const [configTool, setConfigTool] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => { }
    });

    const showAlert = (message) => {
        setConfirmModal({
            isOpen: true,
            title: "Error",
            message,
            type: "danger",
            confirmText: "OK",
            showCancel: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    }

    const handleOpenNewWindow = async (toolId) => {
        if (window.pywebview) {
            const success = await window.pywebview.api.open_tool_window(toolId);
            if (success) {
                setConfigTool(null);
            } else {
                showAlert("Failed to open new window");
            }
        } else {
            showAlert("Backend not connected");
        }
    };

    const categories = [
        {
            title: "Basic Tools",
            tools: [
                {
                    id: 'iperf',
                    name: 'iPerf Traffic Generator',
                    icon: <Cpu size={48} className="text-blue-500" />,
                    description: 'Network bandwidth measurement tool',
                    enabled: true
                },
                {
                    id: 'ping',
                    name: 'Ping Tool',
                    icon: <PingLogo color="#22c55e" />,
                    description: 'Check connectivity to a host',
                    enabled: true
                },
                {
                    id: 'scanner',
                    name: 'Port Scanner',
                    icon: <Network size={48} className="text-purple-500" />,
                    description: 'Scan open ports on a target (Coming Soon)',
                    enabled: false
                }
            ]
        },
        {
            title: "Advanced Tools",
            tools: [
                {
                    id: 'wireless-capture',
                    name: 'Wireless Capture',
                    icon: <Ear size={48} className="text-cyan-500" />,
                    description: 'Local/Remote Packet Capture with Monitor Mode and Channel Control',
                    enabled: true
                },
                {
                    id: 'advanced-ping',
                    name: 'Advanced Ping Analysis',
                    icon: <PingLogo color="#f97316" />,
                    description: 'Ping with statistical analysis, smoothing, and distribution charts',
                    enabled: true
                }
            ]
        },
        {
            title: "Protocol Analysis",
            tools: [
                {
                    id: 'rtp',
                    name: 'RTP Stream Analysis',
                    icon: <RtpLogo />,
                    description: 'Analyze RTP streams from PCAP files (Jitter, Loss, FPS)',
                    enabled: true
                },
                {
                    id: 'ba',
                    name: '802.11 BlockAck Analysis',
                    icon: <BaLogo />,
                    description: 'Analyze 802.11 BlockAck mechanism (Retransmission, Window Size)',
                    enabled: true
                }
            ]
        }
    ];

    return (
        <div className="space-y-8 relative">
            {categories.map((cat, idx) => (
                <div key={idx}>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                        {cat.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cat.tools.map(tool => (
                            <div
                                key={tool.id}
                                className={`relative group bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all flex flex-col items-center text-center gap-4 ${!tool.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {tool.enabled && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfigTool(tool);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 h-8 w-8"
                                        title="Configure Tool"
                                        icon={Settings}
                                        iconSize={18}
                                    />
                                )}

                                <div
                                    className="cursor-pointer w-full flex flex-col items-center"
                                    onClick={() => tool.enabled && onSelectTool(tool.id)}
                                >
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full">
                                        {tool.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{tool.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{tool.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Config Modal */}
            {configTool && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfigTool(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-96 max-w-full m-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Settings size={18} /> {configTool.name}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setConfigTool(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" icon={X} iconSize={20} />
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 dark:text-gray-300">Open in New Window</span>
                                <Button
                                    onClick={() => handleOpenNewWindow(configTool.id)}
                                    variant="primary"
                                    size="sm"
                                    icon={ExternalLink}
                                >
                                    Launch
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Launches this tool in a separate, independent window. You can open multiple instances.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText="Cancel"
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type={confirmModal.type}
                showCancel={confirmModal.showCancel}
            />
        </div>
    );
};

export default ToolsPanel;
