import { useState, useEffect } from 'react'
import NodeEditor from './components/NodeEditor'
import IperfPanel from './components/IperfPanel'
import PingPanel from './components/PingPanel'
import AdvancedPingPanel from './components/AdvancedPingPanel'
import RtpPanel from './components/RtpPanel'
import BaPanel from './components/BaPanel'
import WirelessCapturePanel from './components/WirelessCapturePanel'
import ToolsPanel from './components/ToolsPanel'
import AutomationPanel from './components/AutomationPanel'
import DebugPanel from './components/DebugPanel'
import TitleBar from './components/TitleBar'
import Toggle from './components/Toggle'
import { Network, Settings, Cpu, Wrench, PlayCircle, Monitor, ChevronLeft, ChevronRight, Globe, Palette, Bug } from 'lucide-react'
import { translations } from './translations'
import { ToastProvider } from './components/nexus-ui'

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

function AppContent() {
    const [activeTab, setActiveTab] = useState('tools')
    const [lang, setLang] = useState('en')
    const [theme, setTheme] = useState('light')
    const [debugMode, setDebugMode] = useState(false)

    // UI Structure State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    // Display Settings
    const [displayMode, setDisplayMode] = useState('windowed')
    const [resolution, setResolution] = useState('2560x1440')

    const [versions, setVersions] = useState({ app: 'Loading...', tools: {} })
    const [isStandalone, setIsStandalone] = useState(false)
    const t = translations[lang]

    // Handle display settings change
    const handleDisplayChange = (mode, res) => {
        // Prevent unnecessary backend calls if mode matches (though backend handles it too now)
        if (displayMode === mode && resolution === res && mode === 'fullscreen') return;

        setDisplayMode(mode);
        setResolution(res);

        if (window.pywebview) {
            if (mode === 'fullscreen') {
                window.pywebview.api.set_fullscreen(true).then(console.log).catch(console.error);
            } else {
                window.pywebview.api.set_fullscreen(false).then(() => {
                    const [w, h] = res.split('x').map(Number);
                    return window.pywebview.api.set_window_size(w, h);
                }).catch(console.error);
            }
        }
    };

    const handleMaximizeToggle = () => {
        // If currently full, go to windowed. If windowed, go to full.
        const newMode = displayMode === 'fullscreen' ? 'windowed' : 'fullscreen';
        handleDisplayChange(newMode, resolution);
    }



    useEffect(() => {
        // Check for standalone tool mode via hash
        const hash = window.location.hash;
        if (hash && hash.startsWith('#tool=')) {
            const toolId = hash.split('=')[1];
            if (toolId) {
                setActiveTab(toolId);
                setIsStandalone(true);
            }
        }

        // Define global event processor for batched backend events
        window.processEvents = (events) => {
            if (!Array.isArray(events)) return;
            events.forEach(event => {
                if (event && event.type) {
                    window.dispatchEvent(new CustomEvent(event.type, { detail: event.detail }));
                }
            });
        };

        // Mock loading settings
        console.log("Loading settings...")
        if (window.pywebview) {
            window.pywebview.api.get_versions().then(v => {
                setVersions(v)
            }).catch(err => console.error("Failed to load versions", err))
        }
    }, [])

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    const handleSaveSettings = () => {
        alert(t.saved)
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-900 text-white transition-colors duration-300 overflow-hidden">
            <TitleBar
                isFullscreen={displayMode === 'fullscreen'}
                onMaximizeToggle={handleMaximizeToggle}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {!isStandalone && (
                    <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300`}>
                        <div className={`flex items-center h-20 ${isSidebarCollapsed ? 'justify-center' : 'px-6 gap-3'}`}>
                            <img src="/images/logo.png" className="w-8 h-8 object-contain" alt="Nexus" />
                            {!isSidebarCollapsed && <span className="text-xl font-bold text-blue-400 whitespace-nowrap">Nexus Platform</span>}
                        </div>
                        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
                            <button onClick={() => setActiveTab('tools')} title={t.tools} className={`w-full flex items-center p-3 rounded-lg transition-colors ${['tools', 'iperf', 'ping', 'advanced-ping', 'rtp', 'wireless-capture'].includes(activeTab) ? 'bg-blue-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                <Wrench className={isSidebarCollapsed ? '' : 'mr-3'} />
                                {!isSidebarCollapsed && (t.tools || 'Tools')}
                            </button>
                            <button onClick={() => setActiveTab('automation')} title={t.automation} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'automation' ? 'bg-blue-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                <PlayCircle className={isSidebarCollapsed ? '' : 'mr-3'} />
                                {!isSidebarCollapsed && (t.automation || 'Automation')}
                            </button>
                            <button onClick={() => setActiveTab('editor')} title={t.nodeEditor} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'editor' ? 'bg-blue-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                <Network className={isSidebarCollapsed ? '' : 'mr-3'} />
                                {!isSidebarCollapsed && t.nodeEditor}
                            </button>

                            {debugMode && (
                                <button onClick={() => setActiveTab('debug')} title="Debug Showcase" className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'debug' ? 'bg-purple-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                    <Bug className={isSidebarCollapsed ? '' : 'mr-3'} />
                                    {!isSidebarCollapsed && "Debug Showcase"}
                                </button>
                            )}
                        </nav>

                        <div className="p-3 border-t border-gray-800">
                            <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-4' : 'justify-between'}`}>
                                <button onClick={() => setActiveTab('settings')} title={t.settings} className={`p-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                                    <Settings size={20} />
                                </button>

                                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
                                    {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className={`flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden transition-colors duration-300 ${displayMode === 'windowed' ? 'shadow-inner' : ''}`}>
                    {!isStandalone && (
                        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 shadow-sm transition-colors duration-300">
                            <h1 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">{t[activeTab] || activeTab}</h1>
                        </header>
                    )}
                    <main className={`flex-1 ${isStandalone ? 'p-0' : 'p-6'} overflow-auto h-full`}>
                        {activeTab === 'tools' && <ToolsPanel t={t} onSelectTool={setActiveTab} />}
                        {activeTab === 'automation' && <AutomationPanel t={t} />}
                        {activeTab === 'iperf' && <IperfPanel t={t} />}
                        {activeTab === 'ping' && <PingPanel t={t} />}
                        {activeTab === 'advanced-ping' && <AdvancedPingPanel t={t} />}
                        {activeTab === 'rtp' && <RtpPanel t={t} />}
                        {activeTab === 'ba' && <BaPanel t={t} />}
                        {activeTab === 'wireless-capture' && <WirelessCapturePanel active={activeTab === 'wireless-capture'} />}
                        {activeTab === 'editor' && <NodeEditor t={t} />}
                        {activeTab === 'debug' && debugMode && <DebugPanel />}
                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm max-w-2xl transition-colors duration-300">
                                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t.appSettings}</h2>

                                <div className="space-y-6">
                                    {/* Language Settings */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Globe size={20} />
                                            {t.language || 'Language'}
                                        </h3>
                                        <select
                                            value={lang}
                                            onChange={(e) => setLang(e.target.value)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                        >
                                            <option value="en">English</option>
                                            <option value="zh">中文 (Chinese)</option>
                                        </select>
                                    </div>

                                    {/* Appearance Settings */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Palette size={20} />
                                            {t.theme || 'Appearance'}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                {theme === 'dark' ? t.darkMode : t.lightMode}
                                            </div>
                                            <Toggle
                                                label={t.theme}
                                                checked={theme === 'dark'}
                                                onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                            />
                                        </div>
                                    </div>

                                    {/* Display Settings */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Monitor size={20} />
                                            Display
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Mode</label>
                                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                                    <button
                                                        onClick={() => handleDisplayChange('windowed', resolution)}
                                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${displayMode === 'windowed'
                                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                            }`}
                                                    >
                                                        Windowed
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisplayChange('fullscreen', resolution)}
                                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${displayMode === 'fullscreen'
                                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                            }`}
                                                    >
                                                        Fullscreen
                                                    </button>
                                                </div>
                                            </div>

                                            {displayMode === 'windowed' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Resolution</label>
                                                    <select
                                                        value={resolution}
                                                        onChange={(e) => handleDisplayChange('windowed', e.target.value)}
                                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                                    >
                                                        <option value="1280x720">1280 x 720 (HD)</option>
                                                        <option value="1600x900">1600 x 900 (HD+)</option>
                                                        <option value="1920x1080">1920 x 1080 (FHD)</option>
                                                        <option value="2560x1440">2560 x 1440 (2K)</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Debug Settings */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Bug size={20} />
                                            Debug
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                Enable Debug Mode & Component Showcase
                                            </div>
                                            <Toggle
                                                label=""
                                                checked={debugMode}
                                                onChange={(checked) => setDebugMode(checked)}
                                            />
                                        </div>
                                    </div>

                                    {/* About Section */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">About</h3>
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <div className="p-4 rounded-xl">
                                                <img src="/images/full.png" alt="Nexus Networks" className="h-48 w-auto object-contain bg-white dark:bg-transparent rounded-lg p-2" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Nexus Platform</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">v1.3.0</p>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                                <p>Author: 孙钰童 (Celestial Paler)</p>
                                                <p>Email: celestialts@gmail.com</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={handleSaveSettings}
                                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                                        >
                                            {t.save}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}

export default App
