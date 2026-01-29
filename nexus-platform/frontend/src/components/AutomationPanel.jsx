import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, Circle, Save, RefreshCw, MousePointer, Keyboard,
    Plus, Trash2, ChevronRight, ChevronDown, FileText, Folder,
    MoreVertical, FolderPlus, FilePlus, GripVertical, Copy, Settings,
    Layout, Check, Clock, Repeat, AlertTriangle, Eye, Edit3, Terminal,
    Zap, Link as LinkIcon, Box, Layers, FileCode, Lock, Unlock
} from 'lucide-react';
import ConfirmModal from './nexus-ui/ConfirmModal';
import PromptModal from './nexus-ui/PromptModal';
import Input from './common/Input';
import Button from './common/Button';
import Select from './common/Select';
import TextArea from './common/TextArea';
import ScriptPanel from './ScriptPanel';
import Toggle from './Toggle';

const DurationTimer = ({ startTime, endTime }) => {
    const [duration, setDuration] = useState("00:00:00");

    useEffect(() => {
        if (!startTime) {
            setDuration("00:00:00");
            return;
        }

        const update = () => {
            const now = endTime || new Date();
            const start = new Date(startTime);
            const diff = Math.floor((now - start) / 1000);

            if (diff < 0) {
                setDuration("00:00:00");
                return;
            }
            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            setDuration(`${h}:${m}:${s}`);
        };

        update();
        if (endTime) return; // If finished, don't interval

        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime, endTime]);

    return <span>{duration}</span>;
};

const AutomationPanel = ({ t }) => {
    // --- State ---
    const [windows, setWindows] = useState([]);
    const [isAdmin, setIsAdmin] = useState(true);

    // --- Common UI State ---
    const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: () => { } });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        confirmText: 'Confirm',
        onConfirm: () => { },
        showCancel: true
    });

    const showAlert = (message, title = "Alert", type = "info") => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            confirmText: "OK",
            showCancel: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // Note: showSavePrompt is existing logic for dirty check, kept separate for now unless refactored

    // Dirty State
    const [isNodeDirty, setIsNodeDirty] = useState(false);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [pendingSelection, setPendingSelection] = useState(null);

    // Profile State
    const [profiles, setProfiles] = useState([]);
    const [currentProfile, setCurrentProfile] = useState("default");
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // Library State (Split into Actions and Tasks)
    // Nodes: { id, type: 'folder'|'task'|'action', name, children?, data?, sequence? }
    const [actionLibrary, setActionLibrary] = useState([]);
    const [taskLibrary, setTaskLibrary] = useState([]);

    const [expandedFolders, setExpandedFolders] = useState(new Set());

    // Selection State
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [editName, setEditName] = useState("");

    // Action Editor State (for type='action')
    const [actionData, setActionData] = useState({ type: 'click', rel_x: 0, rel_y: 0 });

    // Task Editor State (for type='task')
    const [taskSequence, setTaskSequence] = useState([]);
    const [folderDescription, setFolderDescription] = useState("");

    // Global Settings
    const [globalSettings, setGlobalSettings] = useState({
        targetWindow: "",
        globalLoop: 1,
        globalDelay: 1.0,
        dragThreshold: 10
    });

    // Script State
    const [scripts, setScripts] = useState([]);
    const [selectedScript, setSelectedScript] = useState("");

    // UI State
    const [activeTab, setActiveTab] = useState('editor');
    const [isEditMode, setIsEditMode] = useState(false);

    // Execution State
    const [isRecording, setIsRecording] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [runStats, setRunStats] = useState({
        startTime: null,
        endTime: null,
        totalTasks: 0,
        totalActions: 0,
        status: 'idle' // idle, running, completed, error
    });
    const [queueStatus, setQueueStatus] = useState({ queue: [], current: null, stats: { completed: 0, failed: 0 } });
    const [currentStepIndex, setCurrentStepIndex] = useState(null);

    // Drag & Drop State
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    const logsEndRef = useRef(null);

    const [logFilterLevel, setLogFilterLevel] = useState('INFO');
    const [logFilterModule, setLogFilterModule] = useState('Automation'); // Default to Automation

    // ... existing state ...

    const filteredLogs = logs.filter(log => {
        // Handle legacy string logs
        if (typeof log === 'string') return true;

        // Filter by Module (Simple contains check)
        if (logFilterModule && !log.module.includes(logFilterModule)) return false;

        // Filter by Level
        const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
        const minLevelIdx = levels.indexOf(logFilterLevel);
        const logLevelIdx = levels.indexOf(log.level);

        return logLevelIdx >= minLevelIdx;
    });
    useEffect(() => {
        let interval;
        if (activeTab === 'run' && isRunning) {
            interval = setInterval(async () => {
                try {
                    const status = await window.pywebview.api.get_automation_status();
                    if (status) {
                        // Handle Composite Script Status Structure
                        if (status.type === 'composite') {
                            // If active runner exists, use its status, otherwise use empty/idle status
                            if (status.activeRunnerStatus) {
                                setQueueStatus({
                                    ...status.activeRunnerStatus,
                                    isComposite: true,
                                    compositeName: status.name,
                                    currentScript: status.currentScript
                                });
                            } else {
                                setQueueStatus({
                                    queue: [],
                                    current: null,
                                    stats: { completed: 0, failed: 0 },
                                    isComposite: true,
                                    compositeName: status.name,
                                    currentScript: "Waiting for conditions..."
                                });
                            }
                        } else {
                            setQueueStatus(status);
                        }
                    }
                } catch (e) {
                    console.error("Failed to poll status", e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTab, isRunning]);

    useEffect(() => {
        const handleLogEntry = (e) => {
            const entry = e.detail;
            // Filter logic could be here or in render
            // We store all logs but only render based on filter
            setLogs(prev => [...prev, entry]);
        };
        window.addEventListener('log-entry', handleLogEntry);
        return () => window.removeEventListener('log-entry', handleLogEntry);
    }, []);

    useEffect(() => {
        checkAdmin();
        refreshWindows();
        loadProfiles();
        loadProfile("default");

        const handleLog = (e) => setLogs(prev => [...prev, e.detail.message]);
        const handleDone = () => {
            // Only stop running state if we are in 'editor' mode (single task run)
            // If we are in 'run' mode (script execution), we should NOT stop automatically
            // because scripts can be long-running (periodic).
            // However, we don't have easy access to activeTab inside this closure if it's stale.
            // But we can check if the message implies script completion?
            // Actually, ScriptRunner does NOT emit automation-done.
            // So this event must be coming from somewhere else?
            // Ah, if a single task is run via "Run" button in editor, it emits automation-done.

            // We need to distinguish between Single Task Run and Script Run.
            // Let's use a ref or check activeTab if possible (but closure might be stale).
            // Better: Check if we are running a script or a task.
            // But for now, let's just log it.
            // If we are running a script, we shouldn't receive this event unless we change backend.

            // Wait, if ScriptRunner uses ActionEngine, and ActionEngine finishes...
            // ActionEngine does NOT emit events.
            // AutomationManager._run_engine_thread emits it.
            // ScriptRunner does NOT use _run_engine_thread.
            // So ScriptRunner should NOT trigger this handleDone.

            setIsRunning(false);
            setLogs(prev => [...prev, "Task completed."]);
            setRunStats(prev => ({ ...prev, endTime: new Date(), status: 'completed' }));
        };
        const handleError = (e) => {
            setIsRunning(false);
            setLogs(prev => [...prev, `Error: ${e.detail.message}`]);
            setRunStats(prev => ({ ...prev, endTime: new Date(), status: 'error' }));
        };
        const handleProgress = (e) => {
            setCurrentStepIndex(e.detail.step_index);
        };

        window.addEventListener('automation-log', handleLog);
        window.addEventListener('automation-done', handleDone);
        window.addEventListener('automation-error', handleError);
        window.addEventListener('automation-progress', handleProgress);

        return () => {
            window.removeEventListener('automation-log', handleLog);
            window.removeEventListener('automation-done', handleDone);
            window.removeEventListener('automation-error', handleError);
            window.removeEventListener('automation-progress', handleProgress);
        };
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    useEffect(() => {
        if (activeTab === 'run') {
            loadScripts();
        }
    }, [activeTab]);

    // --- Backend Interactions ---
    const checkAdmin = async () => {
        if (window.pywebview) {
            const admin = await window.pywebview.api.is_admin();
            setIsAdmin(admin);
        }
    };

    const [showAdminPrompt, setShowAdminPrompt] = useState(false);

    const handleRequestAdmin = () => {
        setShowAdminPrompt(true);
    };

    const confirmRequestAdmin = async () => {
        setShowAdminPrompt(false);
        if (window.pywebview) await window.pywebview.api.request_admin();
    };

    const refreshWindows = async () => {
        if (window.pywebview) {
            const wins = await window.pywebview.api.get_windows();
            setWindows(wins);
        }
    };

    const loadProfiles = async () => {
        if (window.pywebview) {
            const list = await window.pywebview.api.list_automation_profiles();
            setProfiles(list || []);
        }
    };

    const loadScripts = async () => {
        if (window.pywebview) {
            const list = await window.pywebview.api.list_scripts(currentProfile);
            const compList = await window.pywebview.api.list_composite_scripts(currentProfile);

            const combined = [
                ...(list || []).map(name => ({ name, type: 'script' })),
                ...(compList || []).map(name => ({ name, type: 'composite' }))
            ];
            setScripts(combined);
        }
    };

    const loadProfile = async (name) => {
        if (window.pywebview) {
            const data = await window.pywebview.api.load_automation_profile(name);
            if (data && !data.status) {
                // Migration & Loading
                let aLib = data.actionLibrary || [];
                let tLib = data.taskLibrary || [];

                // Backward compatibility: if old 'library' exists but new ones don't
                if (!data.actionLibrary && !data.taskLibrary && data.library) {
                    // Simple migration: Actions to ActionLib, Tasks/Folders to TaskLib
                    // Note: This might misplace folders containing actions, but it's a best-effort migration.
                    data.library.forEach(node => {
                        if (node.type === 'action') aLib.push(node);
                        else tLib.push(node);
                    });
                }

                // Ensure types
                const ensureType = (nodes, defaultType) => nodes.map(n => ({
                    ...n,
                    type: n.type || (n.children ? 'folder' : defaultType),
                    children: n.children ? ensureType(n.children, defaultType) : undefined
                }));

                aLib = ensureType(aLib, 'action');
                tLib = ensureType(tLib, 'task');

                // Default Examples if completely empty
                if (aLib.length === 0 && tLib.length === 0 && name === 'default') {
                    const exampleActionId = crypto.randomUUID();
                    aLib = [{
                        id: exampleActionId,
                        type: 'action',
                        name: 'Example Click',
                        data: { type: 'click', rel_x: 100, rel_y: 100 }
                    }];
                    tLib = [{
                        id: crypto.randomUUID(),
                        type: 'task',
                        name: 'Example Task',
                        sequence: [{ type: 'ref', refId: exampleActionId }, { type: 'wait', wait_after: 1.0 }]
                    }];
                }

                setActionLibrary(aLib);
                setTaskLibrary(tLib);

                if (data.settings) setGlobalSettings(data.settings);
                else setGlobalSettings({ targetWindow: "", globalLoop: 1, globalDelay: 1.0, dragThreshold: 10 });

                setCurrentProfile(name);
                setSelectedNodeId(null);
            } else {
                if (name === 'default') {
                    setActionLibrary([]);
                    setTaskLibrary([]);
                    setGlobalSettings({ targetWindow: "", globalLoop: 1, globalDelay: 1.0, dragThreshold: 10 });
                    setCurrentProfile("default");
                } else {
                    showAlert(`Failed to load profile: ${data.message}`, "Load Error", "danger");
                }
            }
        }
    };

    const saveProfile = async (name, aLib, tLib, settingsData) => {
        if (window.pywebview) {
            const data = {
                actionLibrary: aLib || actionLibrary,
                taskLibrary: tLib || taskLibrary,
                settings: settingsData || globalSettings,
                updated_at: new Date().toISOString()
            };
            await window.pywebview.api.save_automation_profile(name, data);
            if (!profiles.includes(name)) {
                setProfiles([...profiles, name]);
            }
        }
    };

    const handleCreateProfile = async () => {
        setPromptModal({
            isOpen: true,
            title: "Enter new profile name",
            placeholder: "Profile Name",
            onConfirm: async (name) => {
                await saveProfile(name, [], [], { targetWindow: "", globalLoop: 1, globalDelay: 1.0, dragThreshold: 10 });
                setCurrentProfile(name);
                setActionLibrary([]);
                setTaskLibrary([]);
                setGlobalSettings({ targetWindow: "", globalLoop: 1, globalDelay: 1.0, dragThreshold: 10 });
                setSelectedNodeId(null);
                setPromptModal({ ...promptModal, isOpen: false });
            }
        });
    };

    const handleDeleteProfile = async (name) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Profile",
            message: `Are you sure you want to delete profile "${name}"?`,
            type: "danger",
            confirmText: "Delete",
            onConfirm: async () => {
                if (window.pywebview) {
                    await window.pywebview.api.delete_automation_profile(name);
                    loadProfiles();
                    if (currentProfile === name) {
                        loadProfile("default");
                    }
                }
                setConfirmModal({ ...confirmModal, isOpen: false });
            }
        });
    };

    // --- Library Management Helpers ---
    const findNode = (nodes, id) => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const findNodeGlobal = (id) => findNode(actionLibrary, id) || findNode(taskLibrary, id);

    const updateNode = (nodes, id, updates) => {
        return nodes.map(node => {
            if (node.id === id) return { ...node, ...updates };
            if (node.children) {
                return { ...node, children: updateNode(node.children, id, updates) };
            }
            return node;
        });
    };

    const deleteNode = (nodes, id) => {
        return nodes.filter(node => {
            if (node.id === id) return false;
            if (node.children) {
                node.children = deleteNode(node.children, id);
            }
            return true;
        });
    };

    const addNode = (nodes, parentId, newNode) => {
        if (!parentId) return [...nodes, newNode];
        return nodes.map(node => {
            if (node.id === parentId) {
                return { ...node, children: [...(node.children || []), newNode] };
            }
            if (node.children) {
                return { ...node, children: addNode(node.children, parentId, newNode) };
            }
            return node;
        });
    };

    const moveNode = (nodes, nodeId, targetId) => {
        const nodeToMove = findNode(nodes, nodeId);
        if (!nodeToMove) return nodes;
        const nodesWithoutMoved = deleteNode(nodes, nodeId);
        if (!targetId) {
            return [...nodesWithoutMoved, nodeToMove];
        } else {
            return addNode(nodesWithoutMoved, targetId, nodeToMove);
        }
    };

    // --- CRUD Operations ---
    const handleCreateFolder = (libType, parentId = null) => {
        setPromptModal({
            isOpen: true,
            title: "Folder Name",
            placeholder: "New Folder",
            onConfirm: (name) => {
                const newFolder = { id: crypto.randomUUID(), type: 'folder', name, children: [] };

                if (libType === 'action') {
                    const newLib = addNode(actionLibrary, parentId, newFolder);
                    setActionLibrary(newLib);
                    saveProfile(currentProfile, newLib, null);
                } else {
                    const newLib = addNode(taskLibrary, parentId, newFolder);
                    setTaskLibrary(newLib);
                    saveProfile(currentProfile, null, newLib);
                }

                if (parentId) {
                    setExpandedFolders(prev => new Set(prev).add(parentId));
                }
                setPromptModal({ ...promptModal, isOpen: false });
            }
        });
    };

    const handleCreateItem = (type, parentId = null) => {
        // type: 'action' or 'task'
        const id = crypto.randomUUID();
        let newItem;

        if (type === 'action') {
            newItem = {
                id, type: 'action', name: "New Action",
                data: []
            };
            const newLib = addNode(actionLibrary, parentId, newItem);
            setActionLibrary(newLib);
            saveProfile(currentProfile, newLib, null);
        } else {
            newItem = {
                id, type: 'task', name: "New Task", sequence: []
            };
            const newLib = addNode(taskLibrary, parentId, newItem);
            setTaskLibrary(newLib);
            saveProfile(currentProfile, null, newLib);
        }
        handleSelectNode(newItem);
    };

    const handleDeleteNode = (e, id, libType) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: "Delete Item",
            message: "Are you sure you want to delete this item? This cannot be undone.",
            type: "danger",
            confirmText: "Delete",
            onConfirm: () => {
                if (libType === 'action') {
                    const newLib = deleteNode(actionLibrary, id);
                    setActionLibrary(newLib);
                    saveProfile(currentProfile, newLib, null);
                } else {
                    const newLib = deleteNode(taskLibrary, id);
                    setTaskLibrary(newLib);
                    saveProfile(currentProfile, null, newLib);
                }
                setConfirmModal({ ...confirmModal, isOpen: false });
            }
        });

        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const handleSelectNode = (node) => {
        if (node.type === 'folder') {
            // If clicking the folder name, select it for editing
            // But we need to distinguish between clicking the arrow (toggle) and the name (select)
            // The renderTree function handles the click event.
            // If we are here, it means the user clicked the item.
            // Let's assume clicking the item selects it, and the arrow is a separate button.

            if (isNodeDirty && selectedNodeId !== node.id) {
                setPendingSelection(node);
                setShowSavePrompt(true);
                return;
            }

            setSelectedNodeId(node.id);
            setEditName(node.name);
            setLogs([]);
            setIsNodeDirty(false);
            return;
        }

        if (isNodeDirty && selectedNodeId !== node.id) {
            setPendingSelection(node);
            setShowSavePrompt(true);
            return;
        }

        setSelectedNodeId(node.id);
        setEditName(node.name);
        if (node.type === 'task') {
            setTaskSequence(node.sequence || []);
        } else if (node.type === 'action') {
            // Support legacy single-object data by wrapping in array
            const data = node.data || [];
            setTaskSequence(Array.isArray(data) ? data : [data]);
        }
        setLogs([]);
        setIsNodeDirty(false);
    };

    const handleConfirmNavigation = () => {
        if (pendingSelection) {
            const node = pendingSelection;
            setSelectedNodeId(node.id);
            setEditName(node.name);
            if (node.type === 'task') {
                setTaskSequence(node.sequence || []);
            } else if (node.type === 'action') {
                const data = node.data || [];
                setTaskSequence(Array.isArray(data) ? data : [data]);
            } else if (node.type === 'folder') {
                setFolderDescription(node.description || "");
            }
            setLogs([]);
            setIsNodeDirty(false);
            setPendingSelection(null);
        }
        setShowSavePrompt(false);
    };

    const handleCancelNavigation = () => {
        setShowSavePrompt(false);
        setPendingSelection(null);
    };

    const toggleFolder = (id) => {
        const newSet = new Set(expandedFolders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedFolders(newSet);
    };

    // --- Saving Changes ---
    const handleSaveChanges = () => {
        if (!selectedNodeId) return;

        // Determine which library the node belongs to
        let isAction = findNode(actionLibrary, selectedNodeId);
        let isTask = findNode(taskLibrary, selectedNodeId);

        let updates = { name: editName };

        if (isAction) {
            if (isAction.type === 'folder') {
                updates.description = folderDescription;
            } else {
                updates.data = taskSequence;
            }
            const newLib = updateNode(actionLibrary, selectedNodeId, updates);
            setActionLibrary(newLib);
            saveProfile(currentProfile, newLib, null);
        } else if (isTask) {
            if (isTask.type === 'folder') {
                updates.description = folderDescription;
            } else {
                updates.sequence = taskSequence;
            }
            const newLib = updateNode(taskLibrary, selectedNodeId, updates);
            setTaskLibrary(newLib);
            saveProfile(currentProfile, null, newLib);
        }
        setIsNodeDirty(false);
    };

    const handleUpdateSettings = (key, value) => {
        const newSettings = { ...globalSettings, [key]: value };
        setGlobalSettings(newSettings);
        saveProfile(currentProfile, null, null, newSettings);
    };

    // Removed old handleRequestAdmin in favor of modal version above

    // --- Recording & Execution ---
    const toggleRecording = async () => {
        if (isRecording) {
            const res = await window.pywebview.api.stop_recording();
            console.log("Recording stopped, result:", res); // Debug log

            if (res.status === 'stopped') {
                const node = findNodeGlobal(selectedNodeId);
                console.log("Current Node:", node, "ID:", selectedNodeId);

                if (node && (node.type === 'task' || node.type === 'action')) {
                    // Attach video file to each action
                    const newItems = res.sequence.map(item => ({
                        ...item
                    }));

                    if (newItems.length === 0) {
                        showAlert("No actions were recorded. Please ensure you are interacting with the target window.", "Recording Empty", "warning");
                    } else {
                        setTaskSequence(prev => [...prev, ...newItems]);
                        setIsNodeDirty(true); // Enable Save button
                    }
                } else {
                    showAlert("Error: Could not find active node to save recording. Please select an Action or Task.", "Recording Error", "danger");
                }

                setIsRecording(false);
                setLogs(prev => [...prev, `Recording stopped. Captured ${res.sequence.length} actions.`]);
            }
        } else {
            if (!globalSettings.targetWindow) {
                return showAlert("Select target window first");
            }

            const startRec = async () => {
                const res = await window.pywebview.api.start_recording(globalSettings.targetWindow, currentProfile, globalSettings.dragThreshold || 10);
                if (res.status === 'started') {
                    setIsRecording(true);
                    setLogs(prev => [...prev, "Recording started..."]);
                }
            };

            if (!isAdmin) {
                setConfirmModal({
                    isOpen: true,
                    title: "Privilege Warning",
                    message: "Not Admin. Continue recording anyway?",
                    type: "warning",
                    confirmText: "Continue",
                    showCancel: true,
                    onConfirm: async () => {
                        await startRec();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                });
                return;
            }

            await startRec();
        }
    };

    const resolveSequence = (seq) => {
        let flat = [];
        for (const step of seq) {
            if (step.type === 'ref') {
                const node = findNodeGlobal(step.refId);
                if (node) {
                    if (node.type === 'action') {
                        // Support both legacy single object and new array format
                        const data = node.data || [];
                        flat.push(...(Array.isArray(data) ? data : [data]));
                    } else if (node.type === 'task') {
                        flat.push(...resolveSequence(node.sequence || []));
                    }
                }
            } else {
                flat.push(step);
            }
        }
        return flat;
    };

    const runTask = async () => {
        if (!globalSettings.targetWindow) return showAlert("Select target window first", "Validation Error", "warning");
        // const resolvedActions = resolveSequence(taskSequence); // Don't resolve, let backend handle refs

        setIsRunning(true);
        setLogs([]);
        setRunStats({
            startTime: new Date(),
            endTime: null,
            totalTasks: 1, // Simplified for now
            totalActions: taskSequence.length,
            status: 'running'
        });
        // setActiveTab('run'); // Keep in editor

        try {
            const res = await window.pywebview.api.run_automation_task({
                window_title: globalSettings.targetWindow,
                actions: taskSequence, // Pass raw sequence
                library: [...actionLibrary, ...taskLibrary], // Pass full library for resolution
                loop_count: globalSettings.globalLoop,
                global_delay: globalSettings.globalDelay,
                background_mode: globalSettings.backgroundMode,
                simulate_drag: globalSettings.simulateDrag
            });

            if (res && res.status === 'error') {
                throw new Error(res.message);
            }

            // Don't set completed here, wait for event
            setLogs(prev => [...prev, "Task started..."]);
        } catch (e) {
            setRunStats(prev => ({ ...prev, status: 'error', endTime: new Date() }));
            setLogs(prev => [...prev, "Error: " + e.message || e]);
            setIsRunning(false);
        }
    };

    const stopTask = async () => {
        await window.pywebview.api.stop_automation_task();
        setIsRunning(false);
    };

    const runSelectedScript = async () => {
        if (!selectedScript) return showAlert("Select a script first", "Validation Error", "warning");
        if (!globalSettings.targetWindow) return showAlert("Select target window first", "Validation Error", "warning");

        setIsRunning(true);
        setLogs([]);
        setRunStats({
            startTime: new Date(),
            endTime: null,
            totalTasks: 0,
            totalActions: 0,
            status: 'running'
        });

        try {
            // Check if it's a composite script
            const scriptObj = scripts.find(s => (typeof s === 'object' ? s.name : s) === selectedScript);
            const isComposite = scriptObj && typeof scriptObj === 'object' && scriptObj.type === 'composite';

            if (isComposite) {
                await window.pywebview.api.run_composite_script(
                    selectedScript,
                    taskLibrary,
                    actionLibrary,
                    globalSettings.targetWindow,
                    currentProfile,
                    globalSettings.backgroundMode,
                    globalSettings.simulateDrag
                );
            } else {
                await window.pywebview.api.run_script(
                    selectedScript,
                    taskLibrary,
                    actionLibrary,
                    globalSettings.targetWindow,
                    currentProfile,
                    globalSettings.backgroundMode,
                    globalSettings.simulateDrag
                );
            }
        } catch (e) {
            setRunStats(prev => ({ ...prev, status: 'error', endTime: new Date() }));
            setLogs(prev => [...prev, "Error: " + (e.message || e)]);
            setIsRunning(false);
        }
    };

    const stopSelectedScript = async () => {
        await window.pywebview.api.stop_script();
        setIsRunning(false);
    };

    // --- Drag & Drop ---
    const handleDragStart = (e, node, libType) => {
        if (!isEditMode) return;
        e.stopPropagation();
        const dragData = { type: 'library_node', id: node.id, nodeType: node.type, libType };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        setDraggedItem(dragData);
    };

    const handleDragOver = (e, nodeId) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(nodeId);
    };

    const handleDrop = (e, targetId, targetLibType) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);

        const data = JSON.parse(e.dataTransfer.getData('application/json'));

        // Case 1: Reordering Sequence
        if (data.type === 'sequence_item') {
            if (targetId === 'SEQUENCE_EDITOR') {
                // Dropped at the end
                moveSequenceItem(data.index, taskSequence.length);
            } else if (typeof targetId === 'number') {
                // Dropped on another item
                // If moving down, the target index shifts by 1 after removal
                // But since we want to insert BEFORE the target, and the target index is based on the OLD array,
                // we need to adjust.
                // Example: [0, 1, 2]. Move 0 to 2. Target is 2.
                // Remove 0 -> [1, 2]. Target 2 is now at index 1.
                // We want to insert before it (at index 1).
                // So moveSequenceItem(0, 1).
                // So if from < to, use to - 1.
                if (data.index < targetId) {
                    moveSequenceItem(data.index, targetId - 1);
                } else {
                    moveSequenceItem(data.index, targetId);
                }
            }
            return;
        }

        // Case 2: Dropping Library Node onto Sequence Editor
        if (targetId === 'SEQUENCE_EDITOR' || typeof targetId === 'number') {
            if (selectedNodeId && findNode(taskLibrary, selectedNodeId)) {
                const newItem = { type: 'ref', refId: data.id };
                if (typeof targetId === 'number') {
                    // Insert at specific index
                    const newSeq = [...taskSequence];
                    newSeq.splice(targetId, 0, newItem);
                    setTaskSequence(newSeq);
                    setIsNodeDirty(true);
                } else {
                    // Append to end
                    setTaskSequence(prev => [...prev, newItem]);
                    setIsNodeDirty(true);
                }
            }
            return;
        }

        // Case 3: Reordering Library
        if (data.type !== 'library_node') return;
        if (data.id === targetId) return;

        // Prevent cross-library moves (Action -> Task Lib)
        if (data.libType !== targetLibType) return;

        if (targetLibType === 'action') {
            const newLib = moveNode(actionLibrary, data.id, targetId);
            setActionLibrary(newLib);
            saveProfile(currentProfile, newLib, null);
        } else {
            const newLib = moveNode(taskLibrary, data.id, targetId);
            setTaskLibrary(newLib);
            saveProfile(currentProfile, null, newLib);
        }
    };

    // --- Render Helpers ---
    const renderTree = (nodes, libType, level = 0) => {
        return nodes.map(node => (
            <div key={node.id} className="select-none">
                <div
                    className={`flex items-center gap-1 p-1 rounded cursor-pointer ${selectedNodeId === node.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ${dragOverId === node.id ? 'bg-blue-200 dark:bg-blue-800' : ''}`}
                    style={{ paddingLeft: `${level * 12 + 4}px` }}
                    onClick={() => handleSelectNode(node)}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, node, libType)}
                    onDragOver={(e) => node.type === 'folder' && handleDragOver(e, node.id)}
                    onDrop={(e) => node.type === 'folder' && handleDrop(e, node.id, libType)}
                >
                    {node.type === 'folder' && (
                        <div
                            className="text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5"
                            onClick={(e) => { e.stopPropagation(); toggleFolder(node.id); }}
                        >
                            {expandedFolders.has(node.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    )}
                    {node.type === 'task' && <FileText size={14} className="text-blue-400 ml-4" />}
                    {node.type === 'action' && <Zap size={14} className="text-orange-400 ml-4" />}

                    <span className="text-sm truncate flex-1">{node.name}</span>

                    {isEditMode && (
                        <div className="flex gap-1 opacity-0 hover:opacity-100 items-center">
                            {node.type === 'folder' && (
                                <>
                                    <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); handleCreateFolder(libType, node.id); }} title="Folder" icon={FolderPlus} iconSize={12} />
                                    {libType === 'action' ? (
                                        <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); handleCreateItem('action', node.id); }} title="Action" icon={Zap} iconSize={12} />
                                    ) : (
                                        <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); handleCreateItem('task', node.id); }} title="Task" icon={FilePlus} iconSize={12} />
                                    )}
                                </>
                            )}
                            <Button variant="ghost" size="icon" className="w-5 h-5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={(e) => handleDeleteNode(e, node.id, libType)} icon={Trash2} iconSize={12} />
                        </div>
                    )}
                </div>
                {node.type === 'folder' && expandedFolders.has(node.id) && (
                    <div>
                        {renderTree(node.children || [], libType, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const renderSequenceItem = (item, idx) => {
        if (item.type === 'ref') {
            const refNode = findNodeGlobal(item.refId);
            return (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                    <LinkIcon size={14} className="text-gray-400" />
                    <span className={`text-sm font-medium ${refNode?.type === 'action' ? 'text-orange-500' : 'text-blue-500'}`}>
                        {refNode ? refNode.name : "Unknown Ref"}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                        {refNode?.type === 'action' ? 'Atomic Action' : 'Sub-Task'}
                    </span>
                </div>
            );
        }

        // Inline Action (Read Only)
        if (!isEditMode) {
            return (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                    <span className="text-xs font-mono text-gray-400">{item.type}</span>
                    {item.type === 'click' && <span className="text-xs">({item.rel_x}, {item.rel_y})</span>}
                    {item.type === 'drag' && <span className="text-xs">Drag ({item.start_x}, {item.start_y}) &rarr; ({item.end_x}, {item.end_y})</span>}
                    {item.type === 'key' && <span className="text-xs">"{item.key}"</span>}
                    {item.type === 'key_down' && <span className="text-xs">Key Down "{item.key}"</span>}
                    {item.type === 'key_up' && <span className="text-xs">Key Up "{item.key}"</span>}
                    {item.type === 'wait' && (
                        <span className="text-xs">
                            {item.wait_strategy === 'random'
                                ? `Random ${item.wait_min}-${item.wait_max}s`
                                : `${item.wait_after}s`}
                        </span>
                    )}
                </div>
            );
        }

        // Inline Action (Edit Mode)
        return (
            <div className="flex flex-col gap-2 bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                    <Select
                        value={item.type}
                        onChange={e => updateSequenceItem(idx, { type: e.target.value })}
                        wrapperClassName="w-auto"
                        className="text-xs !py-1 h-8"
                    >
                        <option value="click">Click</option>
                        <option value="drag">Drag</option>
                        <option value="key">Key</option>
                        <option value="key_down">Key Down</option>
                        <option value="key_up">Key Up</option>
                        <option value="wait">Wait</option>
                    </Select>

                    {item.type === 'click' && (
                        <>
                            <Input
                                type="number"
                                value={item.rel_x ?? ''}
                                onChange={e => updateSequenceItem(idx, { rel_x: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                wrapperClassName="w-auto"
                                className="w-16 text-xs !py-1 h-8"
                                placeholder="X"
                            />
                            <Input
                                type="number"
                                value={item.rel_y ?? ''}
                                onChange={e => updateSequenceItem(idx, { rel_y: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                wrapperClassName="w-auto"
                                className="w-16 text-xs !py-1 h-8"
                                placeholder="Y"
                            />
                        </>
                    )}

                    {item.type === 'drag' && (
                        <>
                            <div className="flex flex-col gap-1 border-l pl-2 dark:border-gray-700">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 w-6">Start</span>
                                    <Input
                                        type="number"
                                        value={item.start_x ?? ''}
                                        onChange={e => updateSequenceItem(idx, { start_x: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="X1"
                                    />
                                    <Input
                                        type="number"
                                        value={item.start_y ?? ''}
                                        onChange={e => updateSequenceItem(idx, { start_y: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="Y1"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 w-6">End</span>
                                    <Input
                                        type="number"
                                        value={item.end_x ?? ''}
                                        onChange={e => updateSequenceItem(idx, { end_x: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="X2"
                                    />
                                    <Input
                                        type="number"
                                        value={item.end_y ?? ''}
                                        onChange={e => updateSequenceItem(idx, { end_y: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="Y2"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 w-6">Dur</span>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={item.duration ?? 0.5}
                                        onChange={e => updateSequenceItem(idx, { duration: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="Sec"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {(item.type === 'key' || item.type === 'key_down' || item.type === 'key_up') && (
                        <Input
                            type="text"
                            value={item.key}
                            onChange={e => updateSequenceItem(idx, { key: e.target.value })}
                            wrapperClassName="w-auto"
                            className="w-24 text-xs !py-1 h-8"
                            placeholder="Key"
                        />
                    )}

                    {item.type === 'wait' && (
                        <div className="flex items-center gap-1">
                            <Select
                                value={item.wait_strategy || 'fixed'}
                                onChange={e => updateSequenceItem(idx, { wait_strategy: e.target.value })}
                                wrapperClassName="w-auto"
                                className="text-xs !py-1 h-8"
                            >
                                <option value="fixed">Fixed</option>
                                <option value="random">Rnd</option>
                            </Select>
                            {item.wait_strategy === 'random' ? (
                                <>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={item.wait_min ?? ''}
                                        onChange={e => updateSequenceItem(idx, { wait_min: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="Min"
                                    />
                                    <span className="text-xs">-</span>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={item.wait_max ?? ''}
                                        onChange={e => updateSequenceItem(idx, { wait_max: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        wrapperClassName="w-auto"
                                        className="w-14 text-xs !py-1 h-8"
                                        placeholder="Max"
                                    />
                                </>
                            ) : (
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={item.wait_after ?? ''}
                                    onChange={e => updateSequenceItem(idx, { wait_after: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                    wrapperClassName="w-auto"
                                    className="w-16 text-xs !py-1 h-8"
                                    placeholder="Sec"
                                />
                            )}
                        </div>
                    )}

                    {!['click', 'drag', 'key', 'key_down', 'key_up', 'wait'].includes(item.type) && (
                        <div className="text-xs text-red-500 flex items-center gap-2">
                            <span>Unknown: {item.type}</span>
                            {item.type === 'mouse_move' && <span className="text-gray-400">({item.rel_x}, {item.rel_y})</span>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Sequence Editor Helpers
    const moveSequenceItem = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex > taskSequence.length) return;
        const newSeq = [...taskSequence];
        const [moved] = newSeq.splice(fromIndex, 1);
        newSeq.splice(toIndex, 0, moved);
        setTaskSequence(newSeq);
        setIsNodeDirty(true);
    };
    const deleteSequenceItem = (index) => {
        setTaskSequence(taskSequence.filter((_, i) => i !== index));
        setIsNodeDirty(true);
    };

    const updateSequenceItem = (index, updates) => {
        const newSeq = [...taskSequence];
        newSeq[index] = { ...newSeq[index], ...updates };
        setTaskSequence(newSeq);
        setIsNodeDirty(true);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Top Bar */}
            <div className="h-12 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg flex items-center gap-2">
                        <Layout size={20} className="text-blue-500" /> {t.automation}
                    </div>
                    <div className="relative">
                        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200">
                            <span className="text-sm font-medium">{currentProfile}</span>
                            <ChevronDown size={14} />
                        </button>
                        {isProfileMenuOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded border dark:border-gray-700 z-10">
                                {profiles.map(p => (
                                    <div key={p} onClick={() => { loadProfile(p); setIsProfileMenuOpen(false); }} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm flex justify-between">
                                        {p} {p === currentProfile && <Check size={14} className="text-green-500" />}
                                    </div>
                                ))}
                                <div className="border-t dark:border-gray-700 mt-1 pt-1">
                                    <button onClick={() => { handleCreateProfile(); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500">{t.newProfile}</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {!isAdmin && (
                        <button onClick={handleRequestAdmin} className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs hover:bg-yellow-200 transition-colors">
                            <AlertTriangle size={12} /> {t.noAdmin}
                        </button>
                    )}
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded p-1 px-3">
                        <span className="text-xs font-medium text-gray-500">{isEditMode ? t.edit : t.readOnly}</span>
                        <Toggle checked={isEditMode} onChange={setIsEditMode} />
                        {isEditMode ? <Unlock size={14} className="text-blue-500" /> : <Lock size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1 gap-1">
                        <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('settings')} icon={Settings}>{t.settings}</Button>
                        <Button variant={activeTab === 'editor' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('editor')} icon={FileText}>{t.tasks}</Button>
                        <Button variant={activeTab === 'script' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('script')} icon={FileCode}>{t.script}</Button>
                        <Button variant={activeTab === 'run' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('run')} icon={Play} className={activeTab === 'run' ? "text-green-600 dark:text-green-400" : ""}>{t.execute}</Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {activeTab === 'script' && (
                    <ScriptPanel t={t} taskLibrary={taskLibrary} actionLibrary={actionLibrary} currentProfile={currentProfile} isEditMode={isEditMode} />
                )}

                {activeTab === 'run' && (
                    <div className="flex-1 flex flex-col p-4 gap-4 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                        {/* Script Execution Toolbar */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700 flex items-center gap-4 shrink-0">
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1 text-gray-500">{t.selectScript}</label>
                                <div className="flex gap-2 w-full">
                                    <Select
                                        value={selectedScript}
                                        onChange={e => setSelectedScript(e.target.value)}
                                        className="flex-1"
                                    >
                                        <option value="">Select Script...</option>
                                        {scripts.map(s => {
                                            const isComposite = typeof s === 'object' && s.type === 'composite';
                                            const name = typeof s === 'object' ? s.name : s;
                                            return (
                                                <option
                                                    key={name}
                                                    value={name}
                                                    className={isComposite ? "text-purple-600 font-bold" : "text-blue-600"}
                                                >
                                                    {name}
                                                </option>
                                            );
                                        })}
                                    </Select>
                                    <Button onClick={loadScripts} variant="secondary" size="icon"><RefreshCw size={18} /></Button>
                                </div>
                            </div>
                            <div className="flex items-end gap-2 h-full pb-0.5">
                                <Button onClick={runSelectedScript} disabled={isRunning || !selectedScript} variant="success" icon={Play}>
                                    {t.executeScript}
                                </Button>
                                <Button onClick={stopSelectedScript} disabled={!isRunning} variant="danger" icon={Square}>
                                    {t.stop}
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex gap-4 overflow-hidden">
                            {/* Left Column: Stats & Queue */}
                            <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
                                {/* Stats Panel */}
                                <div className="grid grid-cols-2 gap-4 shrink-0">
                                    {/* Row 1: Status & Script */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">{t.status}</div>
                                        <div className={`text-xl font-bold ${isRunning ? 'text-blue-500' : 'text-gray-500'}`}>
                                            {isRunning ? t.running : t.idle}
                                        </div>
                                        {queueStatus.isComposite && <div className="text-xs text-purple-500 mt-1 font-medium">{queueStatus.compositeName}</div>}
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">Current Script</div>
                                        <div className="text-xl font-bold text-purple-500 truncate" title={queueStatus.currentScript || queueStatus.current?.taskName || "-"}>
                                            {queueStatus.currentScript || queueStatus.current?.taskName || "-"}
                                        </div>
                                    </div>

                                    {/* Row 2: Started & Duration */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">Started</div>
                                        <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                                            {runStats.startTime ? runStats.startTime.toLocaleTimeString() : "-"}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">Duration</div>
                                        <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                                            <DurationTimer startTime={runStats.startTime} endTime={runStats.endTime} />
                                        </div>
                                    </div>

                                    {/* Row 3: Completed & Failed */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">{t.completed}</div>
                                        <div className="text-xl font-bold text-green-500">{queueStatus.stats.completed}</div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border dark:border-gray-700">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">{t.failed}</div>
                                        <div className="text-xl font-bold text-red-500">{queueStatus.stats.failed}</div>
                                    </div>
                                </div>

                                {/* Task Queue Visualization */}
                                <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow-sm border dark:border-gray-700 flex flex-col overflow-hidden">
                                    <div className="p-3 border-b dark:border-gray-700 font-semibold text-sm flex items-center gap-2">
                                        <Layers size={16} /> {t.executionQueue}
                                    </div>
                                    <div className="flex-1 overflow-auto p-2 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                                        {/* Current Task */}
                                        {queueStatus.current && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 shadow-sm animate-pulse">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t.runningNow}</span>
                                                    <span className="text-xs text-gray-500">{queueStatus.current.triggerType}</span>
                                                </div>
                                                <div className="font-medium text-sm">{queueStatus.current.taskName}</div>
                                                <div className="text-xs text-gray-500 mt-1">Started: {new Date(queueStatus.current.startedAt * 1000).toLocaleTimeString()}</div>
                                            </div>
                                        )}

                                        {/* Queued Tasks */}
                                        {queueStatus.queue.map((task, i) => (
                                            <div key={task.instanceId} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3 shadow-sm opacity-80">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">#{i + 1} {t.waiting}</span>
                                                    <span className="text-xs text-gray-500">{task.triggerType}</span>
                                                </div>
                                                <div className="font-medium text-sm">{task.taskName}</div>
                                                <div className="text-xs text-gray-500 mt-1">Queued: {new Date(task.queuedAt * 1000).toLocaleTimeString()}</div>
                                            </div>
                                        ))}

                                        {!queueStatus.current && queueStatus.queue.length === 0 && (
                                            <div className="text-center text-gray-400 text-xs py-8">
                                                {t.queueEmpty}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Logs */}
                            <div className="flex-1 bg-gray-900 text-green-400 rounded shadow-inner flex flex-col overflow-hidden border dark:border-gray-700">
                                <div className="bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-400 flex justify-between items-center border-b border-gray-700 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span>{t.logs}</span>
                                        <div className="w-24">
                                            <Select
                                                value={logFilterLevel}
                                                onChange={e => setLogFilterLevel(e.target.value)}
                                                className="bg-gray-700 text-white border-none text-xs rounded p-1 py-1 h-6"
                                            >
                                                <option value="DEBUG">DEBUG</option>
                                                <option value="INFO">INFO</option>
                                                <option value="WARNING">WARN</option>
                                                <option value="ERROR">ERROR</option>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setLogs([])} className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700">
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1">
                                    {filteredLogs.length === 0 && <div className="text-gray-600 italic">No logs...</div>}
                                    {filteredLogs.map((l, i) => (
                                        <div key={i} className="break-words border-b border-gray-800 pb-1 mb-1 flex gap-2">
                                            {typeof l === 'string' ? (
                                                <span>{l}</span>
                                            ) : (
                                                <>
                                                    <span className="text-gray-500">[{l.timestamp}]</span>
                                                    <span className={`font-bold ${l.level === 'ERROR' ? 'text-red-500' :
                                                        l.level === 'WARNING' ? 'text-yellow-500' :
                                                            l.level === 'DEBUG' ? 'text-gray-500' : 'text-blue-400'
                                                        }`}>{l.level}</span>
                                                    <span className="text-gray-400">[{l.module}]</span>
                                                    <span>{l.message}</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="flex-1 p-8 max-w-2xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                            <h2 className="text-xl font-semibold border-b dark:border-gray-700 pb-2">{t.globalConfig}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t.targetWindow}</label>
                                    <div className="flex gap-2 max-w-md">
                                        <Select
                                            value={globalSettings.targetWindow}
                                            onChange={e => handleUpdateSettings('targetWindow', e.target.value)}
                                            disabled={!isEditMode}
                                        >
                                            <option value="">Select Window...</option>
                                            {windows.map((w, i) => <option key={i} value={w}>{w}</option>)}
                                        </Select>
                                        <Button variant="secondary" size="icon" onClick={refreshWindows} title="Refresh Windows">
                                            <RefreshCw size={18} />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={globalSettings.backgroundMode || false}
                                            onChange={e => handleUpdateSettings('backgroundMode', e.target.checked)}
                                            disabled={!isEditMode}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">{t.backgroundMode}</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        {t.backgroundModeHelp}
                                    </p>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={globalSettings.simulateDrag || false}
                                            onChange={e => handleUpdateSettings('simulateDrag', e.target.checked)}
                                            disabled={!isEditMode}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">{t.simulateDrag}</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        {t.simulateDragHelp}
                                    </p>
                                </div>
                                <div className="border-t dark:border-gray-700 pt-4 mt-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400">
                                        <input
                                            type="checkbox"
                                            checked={globalSettings.enableVisualization || false}
                                            onChange={e => {
                                                const newValue = e.target.checked;
                                                if (newValue) {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: "⚠️ Enable Visualization?",
                                                        content: "Warning: This feature draws overlay graphics (red circles) on your screen at click locations.\n\nIn some online games, this behavior might be detected as an 'External Overlay' or 'Cheat Software', potentially leading to account bans.\n\nAre you sure you want to enable this?",
                                                        onConfirm: () => {
                                                            handleUpdateSettings('enableVisualization', true);
                                                            setConfirmModal({ isOpen: false });
                                                        },
                                                        confirmText: "Yes, I understand the risk",
                                                        confirmClass: "bg-red-600 hover:bg-red-700"
                                                    });
                                                } else {
                                                    handleUpdateSettings('enableVisualization', false);
                                                }
                                            }}
                                            disabled={!isEditMode}
                                            className="w-4 h-4 accent-red-500"
                                        />
                                        <span className="text-sm font-bold flex items-center gap-1"><Eye size={16} /> Enable Click Visualization (Overlay)</span>
                                    </label>
                                    <p className="text-xs text-red-500/70 mt-1 ml-6">
                                        Debug only. Shows click locations on screen. Risk of detection in games.
                                    </p>
                                </div>
                                <div>
                                    <Input
                                        label={t.dragThreshold}
                                        type="number"
                                        value={globalSettings.dragThreshold || 10}
                                        onChange={e => handleUpdateSettings('dragThreshold', parseInt(e.target.value))}
                                        helpText={t.dragThresholdHelp}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'editor' && (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left: Library (Split View) */}
                        <div className="w-1/3 min-w-[250px] bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">

                            {/* Action Library */}
                            <div className="flex-1 flex flex-col border-b dark:border-gray-700 overflow-hidden">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center border-b dark:border-gray-700">
                                    <div className="font-semibold text-sm flex items-center gap-2 text-orange-600"><Zap size={16} /> {t.actionLibrary}</div>
                                    {isEditMode && (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleCreateFolder('action')} title={t.newFolder} icon={FolderPlus} iconSize={14} />
                                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleCreateItem('action')} title={t.newAction} icon={Plus} iconSize={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-auto p-2" onDragOver={(e) => handleDragOver(e, 'ACTION_ROOT')} onDrop={(e) => handleDrop(e, null, 'action')}>
                                    {actionLibrary.length === 0 ? (
                                        <div className="text-center text-gray-400 text-xs mt-4">{t.noActions}</div>
                                    ) : renderTree(actionLibrary, 'action')}
                                </div>
                            </div>

                            {/* Task Library */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center border-b dark:border-gray-700">
                                    <div className="font-semibold text-sm flex items-center gap-2 text-blue-600"><Layers size={16} /> {t.taskLibrary}</div>
                                    {isEditMode && (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleCreateFolder('task')} title={t.newFolder} icon={FolderPlus} iconSize={14} />
                                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleCreateItem('task')} title={t.newTask} icon={Plus} iconSize={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-auto p-2" onDragOver={(e) => handleDragOver(e, 'TASK_ROOT')} onDrop={(e) => handleDrop(e, null, 'task')}>
                                    {taskLibrary.length === 0 ? (
                                        <div className="text-center text-gray-400 text-xs mt-4">{t.noTasks}</div>
                                    ) : renderTree(taskLibrary, 'task')}
                                </div>
                            </div>
                        </div>

                        {/* Right: Editor */}
                        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                            {selectedNodeId ? (
                                <div className="flex-1 flex flex-col h-full">
                                    {/* Header */}
                                    <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex flex-col gap-4 shadow-sm z-10">
                                        <div className="flex gap-4 items-center justify-between">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 block mb-1">
                                                    {findNodeGlobal(selectedNodeId)?.type === 'action' ? t.atomicActionName : t.taskName}
                                                </label>
                                                <Input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onBlur={handleSaveChanges}
                                                    disabled={!isEditMode}
                                                    className="text-lg font-medium"
                                                />
                                            </div>
                                            {isEditMode && (
                                                <Button onClick={handleSaveChanges} disabled={!isNodeDirty} variant="primary" icon={Save}>{t.save}</Button>
                                            )}
                                        </div>

                                        {/* Toolbar */}
                                        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded border dark:border-gray-700">
                                            <div className="text-xs text-gray-500 mr-auto">{t.target}: {globalSettings.targetWindow || "None"}</div>

                                            {isEditMode && findNodeGlobal(selectedNodeId)?.type === 'action' && (
                                                <Button
                                                    onClick={toggleRecording}
                                                    variant={isRecording ? 'danger' : 'secondary'}
                                                    icon={isRecording ? Square : Circle}
                                                    size="sm"
                                                >
                                                    {isRecording ? t.stop : t.captureAction}
                                                </Button>
                                            )}

                                            {findNodeGlobal(selectedNodeId)?.type === 'task' && (
                                                <>
                                                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-2 h-6"></div>
                                                    <Button onClick={runTask} disabled={isRunning} variant="success" size="sm" icon={Play}>{t.run}</Button>
                                                    <Button onClick={stopTask} disabled={!isRunning} variant="danger" size="sm" icon={Square}>{t.stop}</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Editor Content */}
                                    <div className="flex-1 flex overflow-hidden">
                                        {findNodeGlobal(selectedNodeId)?.type === 'folder' ? (
                                            <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
                                                <TextArea
                                                    label="Folder Description"
                                                    value={folderDescription}
                                                    onChange={(e) => { setFolderDescription(e.target.value); setIsNodeDirty(true); }}
                                                    disabled={!isEditMode}
                                                    placeholder="Enter a description for this folder..."
                                                    className="h-full"
                                                />
                                            </div>
                                        ) : (
                                            /* Unified Sequence Editor */
                                            <div
                                                className="flex-1 overflow-auto p-4 space-y-2 bg-gray-100 dark:bg-gray-900/50"
                                                onDragOver={(e) => { e.preventDefault(); setDragOverId('SEQUENCE_EDITOR'); }}
                                                onDragLeave={() => setDragOverId(null)}
                                                onDrop={(e) => handleDrop(e, 'SEQUENCE_EDITOR')}
                                            >
                                                {taskSequence.length === 0 && (
                                                    <div className={`text-center py-10 text-gray-400 border-2 border-dashed rounded-lg ${dragOverId === 'SEQUENCE_EDITOR' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}`}>
                                                        <p>
                                                            {findNodeGlobal(selectedNodeId)?.type === 'action'
                                                                ? "Add raw events (Click, Key, Wait) or Record"
                                                                : t.selectItemPrompt}
                                                        </p>
                                                    </div>
                                                )}

                                                {taskSequence.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center gap-2 group ${dragOverId === idx ? 'border-t-2 border-blue-500' : ''} ${currentStepIndex === idx ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500' : ''}`}
                                                        draggable={isEditMode}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'sequence_item', index: idx }));
                                                            e.stopPropagation();
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (isEditMode) setDragOverId(idx);
                                                        }}
                                                        onDrop={(e) => {
                                                            e.stopPropagation();
                                                            handleDrop(e, idx);
                                                        }}
                                                    >
                                                        <div className="w-6 text-center text-xs text-gray-400 cursor-move">{idx + 1}</div>
                                                        <div className="flex-1">
                                                            {renderSequenceItem(item, idx)}
                                                        </div>
                                                        {isEditMode && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => moveSequenceItem(idx, idx - 1)}>
                                                                    <ChevronDown size={14} className="rotate-180" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => moveSequenceItem(idx, idx + 1)} icon={ChevronDown} iconSize={14} />
                                                                <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => deleteSequenceItem(idx)} icon={Trash2} iconSize={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {isEditMode && (
                                                    <div className="flex justify-center pt-4 gap-2">
                                                        <Button variant="secondary" className="rounded-full shadow-sm" onClick={() => { setTaskSequence([...taskSequence, { type: 'wait', wait_after: 1.0 }]); setIsNodeDirty(true); }} icon={Plus}>
                                                            {t.wait}
                                                        </Button>
                                                        <Button variant="secondary" className="rounded-full shadow-sm" onClick={() => { setTaskSequence([...taskSequence, { type: 'click', rel_x: 0, rel_y: 0 }]); setIsNodeDirty(true); }} icon={Plus}>
                                                            {t.click}
                                                        </Button>
                                                        <Button variant="secondary" className="rounded-full shadow-sm" onClick={() => { setTaskSequence([...taskSequence, { type: 'key', key: 'enter' }]); setIsNodeDirty(true); }} icon={Plus}>
                                                            {t.key}
                                                        </Button>
                                                        <Button variant="secondary" className="rounded-full shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900" onClick={() => setConfirmModal({
                                                            isOpen: true,
                                                            title: "Clear Actions",
                                                            message: "Are you sure you want to clear all actions?",
                                                            type: "danger",
                                                            confirmText: "Clear",
                                                            onConfirm: () => {
                                                                setTaskSequence([]);
                                                                setIsNodeDirty(true);
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        })} icon={Trash2}>
                                                            {t.clear}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                                    <Layout size={48} className="opacity-20" />
                                    <p>{t.selectItemPrompt}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showSavePrompt}
                title="Unsaved Changes"
                message="You have unsaved changes. Do you want to discard them?"
                confirmText="Discard"
                cancelText="Cancel"
                onConfirm={handleConfirmNavigation}
                onCancel={handleCancelNavigation}
            />

            <ConfirmModal
                isOpen={showAdminPrompt}
                title="Restart as Administrator"
                message="The application needs to restart to acquire Administrator privileges. Continue?"
                confirmText="Restart"
                cancelText="Cancel"
                onConfirm={confirmRequestAdmin}
                onCancel={() => setShowAdminPrompt(false)}
                type="info"
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText || "Cancel"}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type={confirmModal.type}
                showCancel={confirmModal.showCancel}
            />

            <PromptModal
                isOpen={promptModal.isOpen}
                title={promptModal.title}
                placeholder={promptModal.placeholder}
                defaultValue={promptModal.defaultValue}
                onConfirm={promptModal.onConfirm}
                onCancel={() => setPromptModal({ ...promptModal, isOpen: false })}
            />
        </div>
    );
};

export default AutomationPanel;
