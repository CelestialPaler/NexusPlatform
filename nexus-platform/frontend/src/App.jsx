import { useState, useEffect } from 'react'
import NodeEditor from './components/NodeEditor'
import Dashboard from './components/Dashboard'
import IperfPanel from './components/IperfPanel'
import PingPanel from './components/PingPanel'
import AdvancedPingPanel from './components/AdvancedPingPanel'
import RtpPanel from './components/RtpPanel'
import BaPanel from './components/BaPanel'
import WirelessCapturePanel from './components/WirelessCapturePanel'
import ToolsPanel from './components/ToolsPanel'
import AutomationPanel from './components/AutomationPanel'
import TitleBar from './components/TitleBar'
import Toggle from './components/Toggle'
import { Activity, Network, Settings, Moon, Sun, Cpu, Wrench, PlayCircle, Monitor } from 'lucide-react'
import { translations } from './translations'

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [lang, setLang] = useState('en')
    const [theme, setTheme] = useState('light')

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
                    <div className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
                        <div className="text-xl font-bold mb-8 text-blue-400 flex items-center gap-2">
                            <Network /> Nexus Platform
                        </div>
                        <nav className="flex-1 space-y-2">
                            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                                <Activity className="mr-3" /> {t.dashboard}
                            </button>
                            <button onClick={() => setActiveTab('tools')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${['tools', 'iperf', 'ping', 'advanced-ping', 'rtp', 'wireless-capture'].includes(activeTab) ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                                <Wrench className="mr-3" /> {t.tools || 'Tools'}
                            </button>
                            <button onClick={() => setActiveTab('automation')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'automation' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                                <PlayCircle className="mr-3" /> {t.automation || 'Automation'}
                            </button>
                            <button onClick={() => setActiveTab('editor')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'editor' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                                <Network className="mr-3" /> {t.nodeEditor}
                            </button>
                            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                                <Settings className="mr-3" /> {t.settings}
                            </button>
                        </nav>
                    </div>
                )}
                <div className={`flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden transition-colors duration-300 ${displayMode === 'windowed' ? 'shadow-inner' : ''}`}>
                    {!isStandalone && (
                        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 shadow-sm transition-colors duration-300">
                            <h1 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">{t[activeTab] || activeTab}</h1>
                            <div className="ml-auto flex items-center gap-2">
                                {theme === 'dark' ? <Moon className="text-yellow-400" size={20} /> : <Sun className="text-orange-500" size={20} />}
                            </div>
                        </header>
                    )}
                    <main className={`flex-1 ${isStandalone ? 'p-0' : 'p-6'} overflow-auto h-full`}>
                        {activeTab === 'dashboard' && <Dashboard t={t} />}
                        {activeTab === 'tools' && <ToolsPanel t={t} onSelectTool={setActiveTab} />}
                        {activeTab === 'automation' && <AutomationPanel t={t} />}
                        {activeTab === 'iperf' && <IperfPanel t={t} />}
                        {activeTab === 'ping' && <PingPanel t={t} />}
                        {activeTab === 'advanced-ping' && <AdvancedPingPanel t={t} />}
                        {activeTab === 'rtp' && <RtpPanel t={t} />}
                        {activeTab === 'ba' && <BaPanel t={t} />}
                        {activeTab === 'wireless-capture' && <WirelessCapturePanel active={activeTab === 'wireless-capture'} />}
                        {activeTab === 'editor' && <NodeEditor t={t} />}
                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm max-w-2xl transition-colors duration-300">
                                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t.appSettings}</h2>

                                <div className="space-y-6">
                                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.language}</label>
                                        <select
                                            value={lang}
                                            onChange={(e) => setLang(e.target.value)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                        >
                                            <option value="en">English</option>
                                            <option value="zh">中文 (Chinese)</option>
                                        </select>
                                    </div>

                                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                        <Toggle
                                            label={t.theme}
                                            checked={theme === 'dark'}
                                            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                        />
                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {theme === 'dark' ? t.darkMode : t.lightMode}
                                        </div>
                                    </div>

                                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
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

                                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">About</h3>
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <div className="p-4 bg-blue-50 dark:bg-gray-700 rounded-full">
                                                <Network size={48} className="text-blue-600 dark:text-blue-400" />
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
