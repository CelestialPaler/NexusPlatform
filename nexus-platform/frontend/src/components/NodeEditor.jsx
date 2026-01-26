import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, FolderOpen, Play, Code2, Cpu } from 'lucide-react';

import BlueprintNode from './blueprint/BlueprintNode';
import Sidebar from './blueprint/Sidebar';
import BlueprintRunner from './blueprint/BlueprintRunner';

// Register custom node types
const nodeTypes = {
  blueprintNode: BlueprintNode,
};

const initialNodes = [
  { 
    id: '1', 
    type: 'blueprintNode', 
    position: { x: 250, y: 50 }, 
    data: { 
      type: 'trigger', 
      label: 'Start', 
      outputs: [{id: 'exec', type: 'flow', label: 'Exec'}] 
    } 
  },
];

let id = 0;
const getId = () => `node_${id++}`;

const NodeEditorContent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Tabs: 'editor' | 'runner'
  const [activeTab, setActiveTab] = useState('editor');
  
  // Runner State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'blueprintNode',
        position,
        data: { label: type, type: type }, // Default data, improved below based on type
      };

      // Configuration of initial data for specific node types
      // This mimics what we usually do in the node factory / sidebar
      if (type === 'string') newNode.data = { ...newNode.data, label: 'String', value: '', outputs: [{id:'val', type:'string'}]};
      if (type === 'integer') newNode.data = { ...newNode.data, label: 'Integer', value: 0, outputs: [{id:'val', type:'integer'}]};
      if (type === 'boolean') newNode.data = { ...newNode.data, label: 'Boolean', value: false, outputs: [{id:'val', type:'boolean'}]};
      if (type === 'log') newNode.data = { ...newNode.data, label: 'Log', inputs: [{id:'in', type:'flow'}, {id:'msg', type:'string'}], outputs: [{id:'out', type:'flow'}]};
      if (type === 'ping') newNode.data = { ...newNode.data, label: 'Ping', inputs: [{id:'in', type:'flow'}, {id:'ip', type:'string'}], outputs: [{id:'out', type:'flow'}, {id:'rtt', type:'integer'}]};
      if (type === 'trigger') newNode.data = { ...newNode.data, label: 'Start', outputs: [{id:'exec', type:'flow'}]};
      if (type === 'condition') newNode.data = { ...newNode.data, label: 'Branch', inputs: [{id:'in', type:'flow'}, {id:'cond', type:'boolean'}], outputs: [{id:'true', type:'flow'}, {id:'false', type:'flow'}]};
      
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // --- Log Handling ---
  useEffect(() => {
    // Expose log handler to window for backend to call
    window.handleBackendLog = (level, msg, source) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { time, level, msg, source }]);
    };
    return () => { window.handleBackendLog = null; };
  }, []);

  // --- Actions ---
  const onSave = async () => {
      if (!reactFlowInstance) return;
      const flow = reactFlowInstance.toObject();
      const name = prompt("Enter Blueprint Name:", "NewBlueprint");
      if(name && window.pywebview) {
          try {
              const res = await window.pywebview.api.blueprint_save(name, JSON.stringify(flow));
              if(res.status === 'success') alert('Saved to ' + res.path);
              else alert('Error: ' + res.message);
          } catch(e) { alert('Save failed: ' + e); }
      }
  };

  const onLoad = async () => {
      if (!window.pywebview) return;
      
      const name = prompt("Enter Blueprint Name to Load:");
      if(name) {
          try {
              const res = await window.pywebview.api.blueprint_load(name);
              if(res.status === 'success') {
                  const { nodes, edges } = res.data; 
                  setNodes(nodes || []);
                  setEdges(edges || []);
                  alert('Loaded: ' + name);
              } else {
                  alert('Error: ' + res.message);
              }
          } catch(e) { alert('Load failed: ' + e); }
      }
  };
  
  const onStartEngine = async () => {
      if(!reactFlowInstance) return;
      setLogs([]); // Clear logs on start
      setIsRunning(true);
      try {
         const flow = reactFlowInstance.toObject();
         await window.pywebview.api.blueprint_run_flow(flow);
         // Note: Execution is async, logs come in via window.handleBackendLog
      } catch(e) {
         console.error(e);
         setIsRunning(false);
         setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), level: 'error', msg: 'Failed to start: ' + e, source: 'System' }]);
      }
  };

  const onStopEngine = async () => {
      try {
          await window.pywebview.api.blueprint_stop();
          setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), level: 'warn', msg: 'Engine Manual Stop', source: 'System' }]);
          setIsRunning(false);
      } catch(e) {
          console.error(e);
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950">
      
      {/* 1. Header Bar */}
      <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between select-none shrink-0">
          <div className="flex items-center gap-2 text-slate-300 font-bold text-sm tracking-wide">
              <span className="text-emerald-500">Nexus</span> 
              <span className="text-slate-600">/</span> 
              <span>Blueprint Engine</span>
          </div>
          
          <div className="flex bg-slate-800 rounded p-1 gap-1">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab==='editor' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  <Code2 size={14} /> Editor
              </button>
              <button 
                onClick={() => setActiveTab('runner')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab==='runner' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  <Cpu size={14} /> Runner {isRunning && <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
              </button>
          </div>
          
          <div className="flex gap-2">
               <button onClick={onSave} title="Save Blueprint" className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Save size={16}/></button>
               <button onClick={onLoad} title="Load Blueprint" className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><FolderOpen size={16}/></button>
          </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Tab 1: Editor */}
        <div className={`flex h-full w-full ${activeTab === 'editor' ? 'visible' : 'hidden'}`}>
            <Sidebar />
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                {/* Quick overlay controls */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                        onClick={() => { setActiveTab('runner'); onStartEngine(); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded shadow-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <Play size={14} fill="currentColor"/> Run
                    </button>
                </div>
                
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  fitView
                  className="bg-slate-900"
                >
                  <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-700" />
                  <MiniMap className="!bg-slate-900 border !border-slate-700" maskColor="rgba(30, 41, 59, 0.8)" nodeColor="#64748b" />
                  <Background variant="dots" gap={12} size={1} color="#334155" />
                </ReactFlow>
            </div>
        </div>
        
        {/* Tab 2: Runner */}
        {activeTab === 'runner' && (
            <BlueprintRunner 
                isRunning={isRunning} 
                onStart={onStartEngine}
                onStop={onStopEngine}
                logs={logs}
            />
        )}
      </div>
    </div>
  );
};

const NodeEditor = () => (
  <ReactFlowProvider>
    <NodeEditorContent />
  </ReactFlowProvider>
);

export default NodeEditor;
