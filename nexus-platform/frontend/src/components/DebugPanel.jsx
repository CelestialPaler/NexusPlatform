import React, { useState } from 'react';
import {
    Button, Input, Select, TextArea, Switch,
    Checkbox, Slider, ProgressBar, StatusIndicator,
    Tooltip, LogConsole, ConfirmModal, StatCard,
    Badge, Tabs, Spinner, Skeleton, Accordion, Table, useToast
} from './nexus-ui';
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

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto pb-20">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Nexus UI Component Showcase</h2>

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

            {/* Badges & Tabs */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Badges & Tabs</h3>
                <div className="flex gap-2 mb-4">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Critical</Badge>
                    <Badge variant="success">Online</Badge>
                    <Badge variant="warning">Warning</Badge>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                    <Tabs 
                        defaultValue="tab1"
                        items={[
                            { label: 'Overview', value: 'tab1', content: <div className="p-2">This is the Overview content.</div> },
                            { label: 'Settings', value: 'tab2', content: <div className="p-2">Adjust your settings here.</div> },
                            { label: 'Logs', value: 'tab3', content: <div className="p-2">System logs will appear here.</div> },
                        ]}
                    />
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

            {/* Log Console */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-gray-700">Log Console</h3>
                <div className="h-48 border rounded-lg overflow-hidden">
                    <LogConsole logs={logs} />
                </div>
            </section>
        </div>
    );
};

export default DebugPanel;
