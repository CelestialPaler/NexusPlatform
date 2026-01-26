import React, { useCallback, useRef, useState } from 'react';
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

import BlueprintNode from './blueprint/BlueprintNode';
import Sidebar from './blueprint/Sidebar';

// 注册自定义节点类型
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

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const payloadStr = event.dataTransfer.getData('application/payload');
      
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const payload = JSON.parse(payloadStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: payload,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onRun = useCallback(async () => {
    // Export Nodes/Edges as JSON
    // Note: reactFlowInstance has getNodes(), getEdges(), or we use the state
    if (reactFlowInstance) {
       const flow = reactFlowInstance.toObject();
       console.log('Running Blueprint:', flow);
       
       // Call Data Bridge
       // Assuming window.pywebview exists
       if (window.pywebview) {
           try {
             const res = await window.pywebview.api.blueprint_run_flow(flow);
             console.log('Engine Res:', res);
             alert('Blueprint Started: ' + res.active_triggers + ' triggers');
           } catch (e) {
             console.error(e);
             alert('Failed to run: ' + e);
           }
       }
    }
  }, [reactFlowInstance]);

  return (
    <div className="flex h-full w-full bg-slate-950">
      <Sidebar />
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
                onClick={onRun}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg font-bold flex items-center gap-2"
            >
                ▶ Run
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
        >
          <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-700" />
          <MiniMap className="!bg-slate-900 border !border-slate-700" maskColor="rgba(30, 41, 59, 0.8)" nodeColor="#64748b" />
          <Background variant="dots" gap={12} size={1} color="#334155" />
        </ReactFlow>
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
