import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Terminal, Copy } from 'lucide-react';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const LogConsole = ({ logs = [], className, autoScroll = true, height = "h-64", ...props }) => {
    const bottomRef = useRef(null);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    const handleCopy = () => {
        const text = logs.join('\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div className={cn("w-full flex flex-col font-mono text-sm", className)} {...props}>
             <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 rounded-t-lg border-b border-gray-700">
                <div className="flex items-center text-gray-400">
                    <Terminal size={14} className="mr-2" />
                    <span className="text-xs uppercase tracking-wider font-semibold">Console Output</span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Copy to clipboard"
                >
                    <Copy size={14} />
                </button>
            </div>
            
            <div className={cn("w-full bg-gray-950 text-gray-300 p-3 overflow-y-auto rounded-b-lg border border-t-0 border-gray-700", height)}>
                {logs.length === 0 ? (
                    <div className="text-gray-600 italic">No output...</div>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className="whitespace-pre-wrap break-all mb-0.5 last:mb-0">
                            <span className="opacity-50 select-none mr-2 text-xs">
                                {String(index + 1).padStart(3, '0')}
                            </span>
                            {log}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default LogConsole;
