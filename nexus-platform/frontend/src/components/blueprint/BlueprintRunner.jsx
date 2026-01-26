import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Download, FolderOpen, Save, Trash2, Terminal } from 'lucide-react';

const BlueprintRunner = ({ isRunning, onStart, onStop, logs }) => {
  
  // Auto-scroll to bottom of logs
  const logContainerRef = React.useRef(null);
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800">
      
      {/* Control Bar */}
      <div className="h-16 bg-slate-800 flex items-center px-6 gap-4 border-b border-black shadow-md">
        <div className="text-xl font-bold text-slate-300 mr-8">Execution Control</div>
        
        {!isRunning ? (
           <button 
             onClick={onStart}
             className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
           >
             <Play size={20} fill="currentColor" />
             Start Engine
           </button>
        ) : (
           <button 
             onClick={onStop}
             className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded font-bold transition-all shadow-lg hover:shadow-rose-500/20 active:scale-95 animate-pulse"
           >
             <Square size={20} fill="currentColor" />
             Stop Engine
           </button>
        )}
        
        <div className="ml-auto text-slate-500 text-sm">
           Status: <span className={isRunning ? "text-emerald-400 font-mono" : "text-slate-400"}>
               {isRunning ? "RUNNING" : "IDLE"}
           </span>
        </div>
      </div>

      {/* Log Console */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
            <Terminal size={14} />
            Execution Logs
        </div>
        
        <div 
            ref={logContainerRef}
            className="flex-1 bg-black rounded-lg border border-slate-700 p-4 font-mono text-sm overflow-y-auto shadow-inner"
        >
            {logs.length === 0 && (
                <div className="text-slate-600 italic">Target system ready. Waiting for logs...</div>
            )}
            
            {logs.map((log, idx) => {
                let colorClass = "text-slate-300";
                if(log.level === 'warn') colorClass = "text-amber-400";
                if(log.level === 'error') colorClass = "text-rose-400";
                if(log.level === 'success') colorClass = "text-emerald-400"; // custom level
                
                return (
                    <div key={idx} className="mb-1 border-b border-slate-900/50 pb-0.5 last:border-0 hover:bg-white/5">
                        <span className="text-slate-500 mr-2">[{log.time}]</span>
                        <span className="text-cyan-600 font-bold mr-2">[{log.source}]</span>
                        <span className={colorClass}>{log.msg}</span>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default BlueprintRunner;
