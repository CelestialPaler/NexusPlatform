import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "warning" }) => {
    if (!isOpen) return null;

    const colors = {
        warning: {
            icon: "text-yellow-500",
            button: "bg-yellow-600 hover:bg-yellow-700",
            border: "border-yellow-500/20"
        },
        danger: {
            icon: "text-red-500",
            button: "bg-red-600 hover:bg-red-700",
            border: "border-red-500/20"
        },
        info: {
            icon: "text-blue-500",
            button: "bg-blue-600 hover:bg-blue-700",
            border: "border-blue-500/20"
        }
    };

    const style = colors[type] || colors.warning;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`bg-gray-800 border ${style.border} rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gray-700/50 rounded-full ${style.icon}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-gray-300 mb-6 ml-11">
                    {message}
                </p>
                
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${style.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
