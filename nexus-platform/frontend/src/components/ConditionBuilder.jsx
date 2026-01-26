import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Clock, Calendar, ChevronDown, GripVertical, Layers, Repeat } from 'lucide-react';
import TimeInput24 from './TimeInput24';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';

// Global drag state for cross-group DnD
let globalDragState = null;

const ConditionBuilder = ({ node, onChange, isEditMode, isRoot = false }) => {
    const groupId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

    // If node is null/undefined, initialize it as a default group
    if (!node) {
        // We should probably call onChange with a default structure, but we can't do it in render.
        // The parent should handle initialization.
        return <div className="text-red-500">Invalid Condition Node</div>;
    }

    const handleAddCondition = () => {
        const newCond = { type: 'condition', conditionType: 'time_range', days: [0, 1, 2, 3, 4], startTime: '09:00', endTime: '17:00' };
        if (node.type === 'group') {
            const newChildren = [...(node.children || []), newCond];
            onChange({ ...node, children: newChildren });
        } else if (isRoot) {
            // Upgrade root condition to group
            onChange({
                type: 'group',
                operator: 'AND',
                children: [node, newCond]
            });
        }
    };

    const handleAddGroup = () => {
        const newGroup = { type: 'group', operator: 'AND', children: [] };
        if (node.type === 'group') {
            const newChildren = [...(node.children || []), newGroup];
            onChange({ ...node, children: newChildren });
        } else if (isRoot) {
            // Upgrade root condition to group
            onChange({
                type: 'group',
                operator: 'AND',
                children: [node, newGroup]
            });
        }
    };

    const handleRemoveChild = (index) => {
        const newChildren = node.children.filter((_, i) => i !== index);
        onChange({ ...node, children: newChildren });
    };

    const handleUpdateChild = (index, newChildNode) => {
        const newChildren = [...node.children];
        newChildren[index] = newChildNode;
        onChange({ ...node, children: newChildren });
    };

    // Drag & Drop Handlers
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const handleDragStart = (e, index) => {
        e.stopPropagation();
        globalDragState = {
            groupId,
            index,
            node: node.children[index],
            remove: () => handleRemoveChild(index)
        };
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'condition_node' }));
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        if (isEditMode) setDragOverIndex(index);
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverIndex(null);
        if (!isEditMode || !globalDragState) return;

        const { groupId: srcGroupId, index: srcIndex, node: srcNode, remove } = globalDragState;

        // Prevent dropping a group into itself or its children (basic cycle prevention)
        // This is a weak check, but better than nothing. 
        // Ideally we'd check if target is a descendant of srcNode.

        if (srcGroupId === groupId) {
            // Same group reorder
            if (srcIndex === targetIndex) return;
            const newChildren = [...node.children];
            const [moved] = newChildren.splice(srcIndex, 1);
            newChildren.splice(targetIndex, 0, moved);
            onChange({ ...node, children: newChildren });
        } else {
            // Cross group move
            // 1. Remove from old location
            remove();
            // 2. Add to new location
            const newChildren = [...node.children];
            newChildren.splice(targetIndex, 0, srcNode);
            onChange({ ...node, children: newChildren });
        }
        globalDragState = null;
    };

    if (node.type === 'group') {
        const isAnd = node.operator === 'AND';
        const bgColor = isAnd ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
        const borderColor = isAnd ? 'border-red-200 dark:border-red-800' : 'border-blue-200 dark:border-blue-800';

        return (
            <div className={`border rounded-lg p-3 ${bgColor} ${borderColor} space-y-3`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Layers size={16} className={isAnd ? "text-red-500" : "text-blue-500"} />
                        <select
                            value={node.operator}
                            onChange={(e) => onChange({ ...node, operator: e.target.value })}
                            disabled={!isEditMode}
                            className={`text-xs font-bold px-2 py-1 rounded border ${isAnd ? 'text-red-700 bg-red-100 border-red-300' : 'text-blue-700 bg-blue-100 border-blue-300'}`}
                        >
                            <option value="AND">AND (All True)</option>
                            <option value="OR">OR (Any True)</option>
                        </select>
                    </div>
                    {isEditMode && (
                        <div className="flex gap-2">
                            <button onClick={handleAddCondition} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs hover:bg-gray-50 shadow-sm">
                                <Plus size={12} /> Condition
                            </button>
                            <button onClick={handleAddGroup} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs hover:bg-gray-50 shadow-sm">
                                <Plus size={12} /> Group
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                    {(!node.children || node.children.length === 0) && (
                        <div
                            className="text-xs text-gray-400 italic p-4 border-2 border-dashed border-transparent hover:border-purple-300 rounded transition-colors"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => handleDrop(e, 0)}
                        >
                            Empty group... (Drop here)
                        </div>
                    )}
                    {node.children?.map((child, idx) => (
                        <div
                            key={idx}
                            draggable={isEditMode}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            className={`relative group/item ${dragOverIndex === idx ? 'border-t-2 border-purple-500' : ''}`}
                        >
                            <ConditionBuilder
                                node={child}
                                onChange={(newChild) => handleUpdateChild(idx, newChild)}
                                isEditMode={isEditMode}
                            />
                            {isEditMode && (
                                <button
                                    onClick={() => handleRemoveChild(idx)}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded shadow-sm"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Leaf Node: Condition
    return (
        <div className="relative">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Select
                        value={node.conditionType}
                        onChange={(e) => onChange({ ...node, conditionType: e.target.value })}
                        disabled={!isEditMode}
                        className="text-xs font-medium h-7 !py-0 !pl-2"
                        wrapperClassName="w-auto"
                    >
                        <option value="time_range">Time Range</option>
                        <option value="aligned">Aligned Interval</option>
                        <option value="interval">Periodic Interval</option>
                    </Select>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
                </div>

                {/* Condition Specific Inputs */}
                {node.conditionType === 'time_range' && (
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Days */}
                        <div className="flex gap-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, dIdx) => {
                                const isSelected = node.days && node.days.includes(dIdx);
                                return (
                                    <button
                                        key={dIdx}
                                        onClick={() => {
                                            if (!isEditMode) return;
                                            const newDays = isSelected
                                                ? node.days.filter(x => x !== dIdx)
                                                : [...(node.days || []), dIdx];
                                            onChange({ ...node, days: newDays });
                                        }}
                                        className={`w-6 h-6 text-xs rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Time */}
                        <div className="flex items-center gap-1 text-sm">
                            <Clock size={14} className="text-gray-400" />
                            <TimeInput24
                                value={node.startTime || "00:00"}
                                onChange={(val) => onChange({ ...node, startTime: val })}
                                disabled={!isEditMode}
                            />
                            <span className="text-gray-400">-</span>
                            <TimeInput24
                                value={node.endTime || "23:59"}
                                onChange={(val) => onChange({ ...node, endTime: val })}
                                disabled={!isEditMode}
                            />
                        </div>
                    </div>
                )}

                {node.conditionType === 'aligned' && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Every</span>
                        <Input
                            type="number"
                            value={node.interval || 5}
                            onChange={e => onChange({ ...node, interval: parseInt(e.target.value) })}
                            disabled={!isEditMode}
                            wrapperClassName="w-auto"
                            className="w-12 px-1 py-0.5 text-center h-7"
                        />
                        <span className="text-gray-500">min, aligned to</span>
                        <TimeInput24
                            value={node.baseTime || "00:00"}
                            onChange={(val) => onChange({ ...node, baseTime: val })}
                            disabled={!isEditMode}
                        />
                        <span className="text-gray-500">(Active for</span>
                        <Input
                            type="number"
                            value={node.duration || 60}
                            onChange={e => onChange({ ...node, duration: parseInt(e.target.value) })}
                            disabled={!isEditMode}
                            wrapperClassName="w-auto"
                            className="w-12 px-1 py-0.5 text-center h-7"
                        />
                        <span className="text-gray-500">sec)</span>
                    </div>
                )}

                {node.conditionType === 'interval' && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Active every</span>
                        <Input
                            type="number"
                            value={node.interval || 10}
                            onChange={e => onChange({ ...node, interval: parseInt(e.target.value) })}
                            disabled={!isEditMode}
                            wrapperClassName="w-auto"
                            className="w-12 px-1 py-0.5 text-center h-7"
                        />
                        <span className="text-gray-500">min</span>
                        <span className="text-gray-500">for</span>
                        <Input
                            type="number"
                            value={node.duration || 60}
                            onChange={e => onChange({ ...node, duration: parseInt(e.target.value) })}
                            disabled={!isEditMode}
                            wrapperClassName="w-auto"
                            className="w-12 px-1 py-0.5 text-center h-7"
                        />
                        <span className="text-gray-500">sec</span>
                    </div>
                )}
            </div>

            {/* Root Level Add Buttons (Only if this is the root condition) */}
            {isRoot && isEditMode && (
                <div className="flex gap-2 mt-2 justify-center">
                    <Button onClick={handleAddCondition} variant="secondary" size="sm" icon={Plus} iconSize={12}>
                        Add Condition (Wrap in Group)
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ConditionBuilder;
