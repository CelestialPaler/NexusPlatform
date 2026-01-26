import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play, Activity, Clock, Split, Terminal } from 'lucide-react';

// 图标映射
const icons = {
  trigger: Play,
  action: Activity,
  condition: Split,
  delay: Clock,
  log: Terminal
};

// 端口颜色定义的 Tailwind 类
const handleColors = {
  flow: '!bg-white !w-3 !h-3', // 执行流
  string: '!bg-green-400',     // 字符串数据
  number: '!bg-blue-400',      // 数字数据
  boolean: '!bg-red-400'       // 布尔数据
};

const BlueprintNode = ({ data, isConnectable }) => {
  const Icon = icons[data.type] || Activity;
  
  // 节点样式：根据类型区分头部颜色
  const headerColors = {
    trigger: 'bg-emerald-600',
    action: 'bg-blue-600',
    condition: 'bg-orange-600',
    delay: 'bg-gray-600',
    log: 'bg-slate-700'
  };

  return (
    <div className="min-w-[150px] shadow-xl rounded-md bg-slate-800 border-2 border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`px-3 py-1 flex items-center gap-2 ${headerColors[data.type] || 'bg-slate-600'}`}>
        <Icon size={14} className="text-white" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">{data.label}</span>
      </div>

      {/* Body */}
      <div className="p-3 relative">
        
        {/* Process Inputs (Left) */}
        {data.inputs?.map((input, index) => (
          <div key={`${input.id}-${index}`} className="relative flex items-center mb-2 last:mb-0 h-4">
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              isConnectable={isConnectable}
              className={`${handleColors[input.type] || handleColors.flow}`}
              style={{ left: -18 }}
            />
            <span className="ml-2 text-xs text-slate-300">{input.label}</span>
          </div>
        ))}

        {/* Process Outputs (Right) */}
        {data.outputs?.map((output, index) => (
          <div key={`${output.id}-${index}`} className="relative flex items-center justify-end mb-2 last:mb-0 h-4">
            <span className="mr-2 text-xs text-slate-300">{output.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              isConnectable={isConnectable}
              className={`${handleColors[output.type] || handleColors.flow}`}
              style={{ right: -18 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(BlueprintNode);
