import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Save, RotateCcw, FileText, Code } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import Button from './Button';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const TextEditor = ({ 
    initialValue = '', 
    onSave, 
    label, 
    className, 
    height = "h-96",
    language = "json"
}) => {
    const [value, setValue] = useState(initialValue);
    const [originalValue, setOriginalValue] = useState(initialValue);
    const [isDirty, setIsDirty] = useState(false);

    // Update internal state when initialValue prop changes (e.g. file loaded from outside)
    useEffect(() => {
        setValue(initialValue);
        setOriginalValue(initialValue);
        setIsDirty(false);
    }, [initialValue]);

    const handleChange = (val) => {
        setValue(val);
        setIsDirty(val !== originalValue);
    };

    const handleRestore = () => {
        if (window.confirm('确定要还原到上次保存的状态吗？所有未保存的更改将丢失。')) {
            setValue(originalValue);
            setIsDirty(false);
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave(value);
        }
        setOriginalValue(value);
        setIsDirty(false);
    };

    return (
        <div className={cn("flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm transition-all duration-200", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium text-sm">
                    {language === 'json' ? <Code size={16} className="text-yellow-600 dark:text-yellow-500" /> : <FileText size={16} className="text-blue-500" />}
                    <span>{label || "Text Editor"}</span>
                    {isDirty && <span className="text-xs text-amber-600 dark:text-amber-500 font-normal ml-1 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">Unsaved</span>}
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleRestore}
                        disabled={!isDirty}
                        icon={RotateCcw}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="还原更改"
                    >
                        还原
                    </Button>
                    <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={handleSave}
                        disabled={!isDirty}
                        icon={Save}
                    >
                        保存
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className={cn("relative w-full overflow-hidden", height)}>
                <CodeMirror
                    value={value}
                    height="100%"
                    extensions={[json()]}
                    onChange={handleChange}
                    className="text-base"
                    theme="dark" // Assuming dark mode for now, or we can make this dynamic later
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        foldGutter: true,
                    }}
                />
            </div>
            
            {/* Footer Status (Optional) */}
            <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
               <span>Lines: {value.split('\n').length}</span>
               <span>{language.toUpperCase()}</span>
            </div>
        </div>
    );
};

export default TextEditor;
