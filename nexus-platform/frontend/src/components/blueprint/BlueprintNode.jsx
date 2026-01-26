import React, { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Play, Activity, Clock, Split, Terminal, Database, Zap, Type, Hash, CheckSquare } from 'lucide-react';

// 图标映射
const icons = {
  trigger: Play,
  action: Activity,
  condition: Split,
  delay: Clock,
  log: Terminal,
  data: Database,
  event: Zap,
  string: Type,
  number: Hash,
  boolean: CheckSquare
};

// 端口样式配置
const handleStyles = {
  flow: 'w-4 h-4 bg-white rounded-none clip-arrow', // Execution Flow (White Arrow-ish)
  string: 'w-3 h-3 bg-fuchsia-500 rounded-full',     // String (Pink)
  number: 'w-3 h-3 bg-cyan-400 rounded-full',        // Number (Cyan)
  boolean: 'w-3 h-3 bg-red-500 rounded-full',        // Boolean (Red)
  any: 'w-3 h-3 bg-slate-300 rounded-sm'             // Any (Square)
};

const BlueprintNode = ({ id, data, isConnectable }) => {
  const { setNodes } = useReactFlow();
  const Icon = icons[data.type] || Activity;
  
  // 节点头部颜色映射
  const headerGradient = {
    trigger: 'from-emerald-600 to-emerald-800',
    action: 'from-blue-600 to-blue-800',
    condition: 'from-orange-600 to-orange-800',
    delay: 'from-gray-600 to-gray-800',
    log: 'from-slate-600 to-slate-800',
    string: 'from-fuchsia-600 to-fuchsia-800',
    number: 'from-cyan-600 to-cyan-800',
    boolean: 'from-red-600 to-red-800'
  }[data.type] || 'from-slate-600 to-slate-800';

  // 内部 Widget 更新逻辑
  const onWidgetChange = useCallback((evt) => {
    const newVal = evt.target.type === 'checkbox' ? evt.target.checked : evt.target.value;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Update both the widget value AND the reflected label if needed
          return {
            ...node,
            data: { ...node.data, value: newVal }
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  return (
    <div className="min-w-[200px] shadow-2xl rounded-lg bg-slate-900/95 border border-slate-600 overflow-hidden backdrop-blur-sm transition-transform hover:scale-[1.01] hover:border-slate-400">
      
      {/* Header */}
      <div className={`px-4 py-2 flex items-center gap-2 bg-gradient-to-r ${headerGradient} border-b border-white/10`}>
        <Icon size={16} className="text-white drop-shadow-md" />
        <span className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">{data.label}</span>
      </div>

      {/* Body: Two-column Layout for Inputs and Outputs */}
      <div className="flex flex-col p-3 gap-2 relative">
        
        {/* Top: Inputs & Outputs Row */}
        <div className="flex flex-row justify-between gap-8 h-full min-h-[20px]">
           {/* Left Column: Inputs */}
           <div className="flex flex-col gap-3 min-w-[20px]">
            {data.inputs?.map((input, index) => (
              <div key={`${input.id}-${index}`} className="relative flex items-center h-5 group">
                {/* Handle (Pin) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.id}
                  isConnectable={isConnectable}
                  className={`!border-2 !border-slate-800 transition-colors ${handleStyles[input.type] || handleStyles.flow} hover:ring-2 hover:ring-white/50`}
                  style={{ left: -21, top: '50%', transform: 'translateY(-50%)' }} 
                />
                {/* Label */}
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                  {input.label || input.id}
                </span>
              </div>
            ))}
          </div>

          {/* Right Column: Outputs */}
          <div className="flex flex-col gap-3 min-w-[20px] items-end text-right">
            {data.outputs?.map((output, index) => (
              <div key={`${output.id}-${index}`} className="relative flex items-center h-5 group justify-end">
                {/* Label */}
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors mr-1">
                  {output.label || output.id}
                </span>
                {/* Handle (Pin) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  isConnectable={isConnectable}
                  className={`!border-2 !border-slate-800 transition-colors ${handleStyles[output.type] || handleStyles.flow} hover:ring-2 hover:ring-white/50`}
                  style={{ right: -21, top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Middle: Widget Area (Input Fields) */}
        {data.widget && (
           <div className="mt-2 pt-2 border-t border-slate-700">
             {data.widget === 'text' && (
                <input 
                  type="text" 
                  className="nodrag w-full bg-slate-950 border border-slate-700 text-xs text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                  value={data.value || ''}
                  onChange={onWidgetChange}
                  placeholder="Value..."
                />
             )}
             {data.widget === 'number' && (
                <input 
                  type="number" 
                  className="nodrag w-full bg-slate-950 border border-slate-700 text-xs text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                  value={data.value || 0}
                  onChange={onWidgetChange}
                />
             )}
             {data.widget === 'boolean' && (
                <div className="flex items-center gap-2">
                  <input 
                     type="checkbox"
                     className="nodrag" 
                     checked={data.value || false}
                     onChange={onWidgetChange}
                  />
                  <span className="text-xs text-slate-300">{data.value ? 'True' : 'False'}</span>
                </div>
             )}
           </div>
        )}

      </div>
      
      {/* Decoration / Status Bar if needed */}
      <div className="h-1 bg-slate-800/50 w-full"></div>
    </div>
  );
};

export default memo(BlueprintNode);
