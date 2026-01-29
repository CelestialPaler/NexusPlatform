import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import ReactDOM from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const ToastItem = ({ id, message, type, onClose }) => {
    const icons = {
        success: <CheckCircle size={18} className="text-green-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        warning: <AlertTriangle size={18} className="text-yellow-500" />,
        info: <Info size={18} className="text-blue-500" />
    };

    const bgColors = {
        success: "border-green-100 dark:border-green-900/50 bg-white dark:bg-gray-800",
        error: "border-red-100 dark:border-red-900/50 bg-white dark:bg-gray-800",
        warning: "border-yellow-100 dark:border-yellow-900/50 bg-white dark:bg-gray-800",
        info: "border-blue-100 dark:border-blue-900/50 bg-white dark:bg-gray-800"
    };

    return (
        <div 
            className={cn(
                "flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-md rounded-lg shadow-lg border transition-all duration-300 transform translate-x-0 opacity-100 mb-2",
                bgColors[type] || bgColors.info,
                "text-gray-800 dark:text-gray-100"
            )}
        >
            <div className="flex-shrink-0">
                {icons[type] || icons.info}
            </div>
            <span className="text-sm font-medium flex-1 break-words">{message}</span>
            <button onClick={() => onClose(id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Render toasts via Portal if needed, but for now fixed container is fine */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
                <div className="pointer-events-auto">
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} {...toast} onClose={removeToast} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
