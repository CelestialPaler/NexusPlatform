import React from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar = ({ isFullscreen, onMaximizeToggle }) => {

    const handleMinimize = () => {
        if (window.pywebview) window.pywebview.api.minimize_window();
    };

    // Use the prop provided by parent to sync state
    const handleMaximizeClick = () => {
        if (onMaximizeToggle) {
            onMaximizeToggle();
        }
    };

    const handleClose = () => {
        if (window.pywebview) window.pywebview.api.close_window();
    };

    // If strictly fullscreen (F11 style), we might want to hide controls, or overlay them.
    // For now, we follow the request: controls in top right.

    return (
        <>
            {/* Invisible Drag Region - Covers top 32px */}
            <div className={`fixed top-0 left-0 w-full h-8 pywebview-drag-region z-[9990] ${isFullscreen ? 'hidden' : ''}`} />

            {/* Window Controls - Top Right Overlay */}
            <div className="fixed top-0 right-0 z-[9991] flex items-center">
                <button
                    onClick={handleMinimize}
                    className="h-8 w-12 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none rounded-none"
                    title="Minimize"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={handleMaximizeClick}
                    className="h-8 w-12 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none rounded-none"
                    title={isFullscreen ? "Restore" : "Maximize"}
                >
                    {isFullscreen ? <Copy size={14} className="transform rotate-180" /> : <Square size={14} />}
                </button>
                <button
                    onClick={handleClose}
                    className="h-8 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-gray-500 dark:text-gray-400 focus:outline-none rounded-none"
                    title="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </>
    );
};

export default TitleBar;
