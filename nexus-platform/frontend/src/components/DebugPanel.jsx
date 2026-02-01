import React, { useState } from 'react';
import {
    Button, Input, Select, TextArea, Switch,
    Checkbox, Slider, ProgressBar, StatusIndicator,
    Tooltip, LogConsole, ConfirmModal, StatCard,
    Badge, Tabs, Spinner, Skeleton, Accordion, Table, useToast, TextEditor
} from './nexus-ui';
import {
    LineChart, BoxChart, HeatMap, BarChart,
    AreaChart, ScatterChart, PieChart, Histogram,
    Surface3DChart, WaterfallChart
} from './nexus-charts';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DebugPanel = () => {
    const { addToast } = useToast();
    const [sliderValue, setSliderValue] = useState(50);
    const [switchValue, setSwitchValue] = useState(false);
    const [checkboxValue, setCheckboxValue] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('option1');
    const [showModal, setShowModal] = useState(false);
    const [logs, setLogs] = useState(['Init debug console...', 'System ready.']);

    const addLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // --- Tab 1: Control Showcase ---
    const renderControls = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Indicators */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Status Indicators</h3>
                <div className="flex flex-wrap gap-4">
                    <StatusIndicator status="success" label="Connected" pulse />
                    <StatusIndicator status="warning" label="Warning" />
                    <StatusIndicator status="error" label="Disconnected" />
                    <StatusIndicator status="info" label="Processing" pulse />
                    <StatusIndicator status="neutral" label="Idle" />
                </div>
            </section>

            {/* Stat Cards */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Stat Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="CURRENT LATENCY"
                        value="23"
                        unit="ms"
                        color="blue"
                        helpText="Real-time round-trip time."
                    />
                    <StatCard
                        title="AVERAGE"
                        value="25"
                        unit="ms"
                        color="neutral"
                    />
                    <StatCard
                        title="MIN / MAX"
                        value="18 / 45"
                        unit="ms"
                        color="blue"
                    />
                    <StatCard
                        title="PACKET LOSS"
                        value="0.05"
                        unit="%"
                        color="red"
                        helpText="Percentage of packets lost in the last 100 samples."
                    />
                </div>
            </section>

            {/* Badges */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Badges</h3>
                <div className="flex gap-2 mb-4">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Critical</Badge>
                    <Badge variant="success">Online</Badge>
                    <Badge variant="warning">Warning</Badge>
                </div>
            </section>

            {/* Buttons */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Buttons</h3>
                <div className="flex flex-wrap gap-4">
                    <Button variant="primary" onClick={() => addLog('Primary clicked')}>Primary</Button>
                    <Button variant="secondary" onClick={() => addLog('Secondary clicked')}>Secondary</Button>
                    <Button variant="danger" onClick={() => addLog('Danger clicked')}>Danger</Button>
                    <Button variant="ghost" onClick={() => addLog('Ghost clicked')}>Ghost</Button>
                    <Button disabled>Disabled</Button>
                    <Button loading>Loading</Button>
                </div>
            </section>

            {/* Form Inputs */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Form Inputs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Text Input"
                        placeholder="Type something..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        helpText="Basic text input field"
                    />
                    <Select
                        label="Select Dropdown"
                        value={selectValue}
                        onChange={(e) => setSelectValue(e.target.value)}
                        options={[
                            { value: 'option1', label: 'Option 1' },
                            { value: 'option2', label: 'Option 2' },
                            { value: 'option3', label: 'Option 3' },
                        ]}
                    />
                    <TextArea
                        label="Text Area"
                        placeholder="Enter description..."
                        className="h-24"
                    />
                    <div className="space-y-6">
                        <Switch
                            label="Toggle Switch"
                            checked={switchValue}
                            onChange={setSwitchValue}
                            helpText={switchValue ? "ON" : "OFF"}
                        />
                        <Checkbox
                            label="Checkbox Option"
                            checked={checkboxValue}
                            onChange={setCheckboxValue}
                        />
                    </div>
                </div>
            </section>

            {/* Sliders & Progress */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Sliders & Progress</h3>
                <div className="space-y-6 max-w-lg">
                    <Slider
                        label="Volume"
                        value={sliderValue}
                        onChange={setSliderValue}
                        min={0}
                        max={100}
                        unit="%"
                    />
                    <ProgressBar
                        value={sliderValue}
                        label="Download Progress"
                        showValue
                        color="blue"
                    />
                    <ProgressBar
                        value={75}
                        label="System Load"
                        color="red"
                        size="sm"
                    />
                </div>
            </section>

            {/* Modals & Overlays */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Modals & Overlays</h3>
                <div className="flex gap-4">
                    <Tooltip content="This is a useful tooltip info">
                        <Button variant="secondary">Hover me for Tooltip</Button>
                    </Tooltip>
                    <Button variant="primary" onClick={() => setShowModal(true)}>Open Modal</Button>
                    <Button variant="outline" onClick={() => addToast('This is a success notification', 'success')}>Toast Success</Button>
                    <Button variant="danger" onClick={() => addToast('Something went wrong!', 'error')}>Toast Error</Button>
                </div>

                <ConfirmModal
                    isOpen={showModal}
                    title="Debug Modal"
                    message="This is a test confirmation modal. Do you acknowledge?"
                    onConfirm={() => {
                        addLog('Modal Confirmed');
                        setShowModal(false);
                    }}
                    onCancel={() => setShowModal(false)}
                />
            </section>

            {/* Feedback & Disclosure */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Feedback & Disclosure</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex gap-4 items-center">
                            <Spinner size={32} />
                            <Spinner size={24} className="text-red-500" />
                            <div className="space-y-2 w-full">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <Accordion
                            items={[
                                { title: 'Advanced Settings', content: 'Here are some advanced settings hidden by default.' },
                                { title: 'Network Logs', content: 'Log data would appear here.' }
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Network Inventory */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Network Inventory Table</h3>
                <Table
                    selectable
                    multiSelect
                    pagination
                    pageSize={3}
                    onSelectionChange={(selected) => console.log('Selection:', selected)}
                    columns={[
                        { header: 'Device Name', accessor: 'name', sortable: true },
                        { header: 'IP Address', accessor: 'ip', sortable: true },
                        { header: 'Status', accessor: 'status', sortable: true, render: (row) => <Badge variant={row.status === 'Online' ? 'success' : 'destructive'}>{row.status}</Badge> }
                    ]}
                    data={[
                        { name: 'Router-X1', ip: '192.168.1.1', status: 'Online' },
                        { name: 'Switch-02', ip: '192.168.1.20', status: 'Offline' },
                        { name: 'AP-Guest', ip: '192.168.10.1', status: 'Online' },
                        { name: 'Camera-01', ip: '192.168.10.5', status: 'Online' },
                        { name: 'Camera-02', ip: '192.168.10.6', status: 'Offline' },
                        { name: 'Printer-Admin', ip: '192.168.1.100', status: 'Online' },
                        { name: 'Server-Main', ip: '10.0.0.1', status: 'Online' },
                    ]}
                />
            </section>

            {/* Text Editor */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Text Editor</h3>
                <TextEditor
                    label="config.json"
                    initialValue={`{
    "app_name": "Nexus Platform",
    "version": "1.0.0",
    "debug": true,
    "features": {
        "auto_scan": true,
        "logging": "verbose"
    }
}`}
                    language="json"
                    onSave={(val) => addLog('Saved config: ' + val.substring(0, 20) + '...')}
                    height="h-64"
                />
            </section>

            {/* Log Console */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Log Console</h3>
                <div className="h-48 border rounded-lg overflow-hidden">
                    <LogConsole logs={logs} />
                </div>
            </section>
        </div>
    );

    // --- Tab 2: Chart Showcase ---
    const renderCharts = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Row 1: Basic Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <LineChart
                        title="Latency Trend (Live)"
                        xLabel="Time"
                        yLabel="ms"
                        series={[
                            { name: "Ping", color: "#3b82f6", x: [1, 2, 3, 4, 5], y: [10, 15, 13, 17, 22] },
                            { name: "Jitter", color: "#f59e0b", x: [1, 2, 3, 4, 5], y: [2, 3, 1, 4, 3] }
                        ]}
                    />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <BoxChart
                        title="Latency Distribution"
                        yLabel="Delay (ms)"
                        dataSeries={[
                            { name: "WiFi 5G", color: "#10b981", y: [12, 14, 15, 12, 13, 18, 55, 14, 13] },
                            { name: "WiFi 2.4G", color: "#ef4444", y: [25, 28, 30, 26, 22, 90, 24, 25, 31] }
                        ]}
                    />
                </div>
            </div>

            {/* Row 2: Advanced Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <BarChart
                        title="Channel Utilization"
                        xLabel="Channel"
                        yLabel="Load %"
                        series={[
                            { name: "Tx", color: "#8b5cf6", x: [1, 6, 11], y: [45, 80, 20] },
                            { name: "Rx", color: "#ec4899", x: [1, 6, 11], y: [30, 60, 10] }
                        ]}
                        stacked
                    />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <PieChart
                        title="Frame Types"
                        donut
                        data={[{
                            labels: ['Mgmt', 'Control', 'Data'],
                            values: [15, 30, 55],
                            name: 'Frames'
                        }]}
                    />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <ScatterChart
                        title="RSSI vs Distance"
                        xLabel="Distance (m)"
                        yLabel="RSSI (dBm)"
                        series={[
                            { name: "AP-1", color: "#3b82f6", x: [1, 2, 5, 10, 20], y: [-30, -45, -60, -75, -85], size: 12 }
                        ]}
                    />
                </div>
            </div>

            {/* Row 3: Scientific Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <Surface3DChart
                        title="Antenna Radiation Pattern (Simulation)"
                        zData={[
                            [10, 10.6, 12.5],
                            [10.5, 12, 13],
                            [11, 12, 12.5]
                        ]}
                    />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <HeatMap
                        title="Channel Correlation Matrix"
                        z={[
                            [1.0, 0.2, 0.1, 0.05, 0.0],
                            [0.2, 1.0, 0.8, 0.4, 0.1],
                            [0.1, 0.8, 1.0, 0.6, 0.2],
                            [0.05, 0.4, 0.6, 1.0, 0.5],
                            [0.0, 0.1, 0.2, 0.5, 1.0]
                        ]}
                        x={['CH36', 'CH40', 'CH44', 'CH48', 'CH149']}
                        y={['CH36', 'CH40', 'CH44', 'CH48', 'CH149']}
                    />
                </div>
            </div>

            {/* Row 4: RF Analysis */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-500 uppercase tracking-widest text-xs">RF Spectrum Analysis</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800">
                    <WaterfallChart
                        title="5G Spectrum Waterfall (Real-time Simulation)"
                        height="400px"
                        channels={['36', '40', '44', '48', '149', '153', '157', '161', '165']}
                        timestamps={['T+0s', 'T+1s', 'T+2s', 'T+3s', 'T+4s', 'T+5s', 'T+6s', 'T+7s', 'T+8s']}
                        data={[
                            [-85, -90, -92, -88, -60, -55, -58, -90, -95], // T0 (Top)
                            [-85, -92, -90, -89, -62, -58, -60, -92, -95],
                            [-88, -90, -95, -90, -65, -60, -62, -90, -92],
                            [-82, -85, -88, -85, -50, -45, -48, -85, -88], // Burst
                            [-82, -84, -86, -84, -52, -48, -50, -84, -86],
                            [-85, -88, -90, -86, -55, -50, -52, -88, -90],
                            [-88, -92, -94, -88, -60, -55, -58, -90, -95],
                            [-90, -95, -96, -90, -70, -65, -68, -95, -98],
                            [-92, -98, -99, -95, -80, -75, -78, -98, -99]  // T8 (Bottom)
                        ]}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto pb-20">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Nexus Debug Console</h2>

            <Tabs
                defaultValue="controls"
                items={[
                    { label: 'Control Showcase (控件)', value: 'controls', content: renderControls() },
                    { label: 'Chart Showcase (图表)', value: 'charts', content: renderCharts() }
                ]}
            />
        </div>
    );
};

export default DebugPanel;
