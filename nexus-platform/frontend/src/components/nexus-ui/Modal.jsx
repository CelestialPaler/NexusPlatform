import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Modal = ({ isOpen, onClose, title, children, className, showClose = true }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose && onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg p-6 transform transition-all scale-100",
                    className
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-xl font-bold text-gray-100">{title}</h3>}
                    {showClose && onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-700/50"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
