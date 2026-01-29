import React, { useState } from 'react';
import { 
    Button, Input, Select, TextArea, Switch, 
    Checkbox, Slider, ProgressBar, StatusIndicator,
    Tooltip, LogConsole, ConfirmModal
} from './nexus-ui';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DebugPanel = () => {
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
