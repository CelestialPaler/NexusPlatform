import React from 'react';

const Sidebar = () => {
  const onDragStart = (event, nodeType, payload) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/payload', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const draggables = [
    {
      category: 'Events (事件)',
      items: [
        { label: '开始运行', type: 'trigger', data: { type: 'trigger', label: 'Start', outputs: [{id: 'exec', type: 'flow', label: 'Exec'}] } },
        { label: '定时器', type: 'trigger', data: { type: 'trigger', label: 'Interval', outputs: [{id: 'exec', type: 'flow', label: 'Tick'}] } },
      ]
    },
    {
      category: 'Actions (动作)',
      items: [
        { label: '执行 Ping', type: 'action', data: { type: 'action', label: 'Ping', inputs: [{id: 'in', type: 'flow'}, {id: 'ip', type: 'string', label: 'IP'}], outputs: [{id: 'out', type: 'flow'}, {id: 'rtt', type: 'number', label: 'RTT'}] } },
        { label: '打印日志', type: 'log', data: { type: 'log', label: 'Log', inputs: [{id: 'in', type: 'flow'}, {id: 'msg', type: 'any', label: 'Msg'}], outputs: [{id: 'out', type: 'flow'}] } },
      ]
    },
    {
      category: 'Logic (逻辑)',
      items: [
        { label: '延迟等待', type: 'delay', data: { type: 'delay', label: 'Delay', inputs: [{id: 'in', type: 'flow'}], outputs: [{id: 'out', type: 'flow'}] } },
        { label: '条件分支', type: 'condition', data: { type: 'condition', label: 'If/Else', inputs: [{id: 'in', type: 'flow'}, {id: 'cond', type: 'boolean', label: 'Cond'}], outputs: [{id: 'true', type: 'flow', label: 'True'}, {id: 'false', type: 'flow', label: 'False'}] } },
      ]
    },
    {
      category: 'Variables (变量)',
      items: [
        { label: 'String (字符串)', type: 'string', data: { type: 'string', label: 'String', widget: 'text', value: '192.168.1.1', outputs: [{id: 'val', type: 'string', label: 'Value'}] } },
        { label: 'Integer (整数)', type: 'number', data: { type: 'number', label: 'Integer', widget: 'number', value: 0, outputs: [{id: 'val', type: 'number', label: 'Value'}] } },
        { label: 'Boolean (布尔)', type: 'boolean', data: { type: 'boolean', label: 'Boolean', widget: 'boolean', value: false, outputs: [{id: 'val', type: 'boolean', label: 'Value'}] } },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full text-slate-300">
      <div className="p-4 border-b border-slate-700 font-bold text-white">
        🛠️ 节点库
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {draggables.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">{group.category}</h3>
            <div className="space-y-2">
              {group.items.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-800 p-2 rounded border border-slate-700 cursor-grab hover:bg-slate-700 hover:border-blue-500 transition-colors flex items-center gap-2 select-none"
                  onDragStart={(event) => onDragStart(event, 'blueprintNode', item.data)}
                  draggable
                >
                  <div className={`w-2 h-2 rounded-full ${
                    item.data.type === 'trigger' ? 'bg-emerald-500' : 
                    item.data.type === 'action' ? 'bg-blue-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        拖拽节点到画布区域
      </div>
    </aside>
  );
};

export default Sidebar;
