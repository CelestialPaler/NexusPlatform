import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import Checkbox from './Checkbox';
import Button from './Button';

/**
 * A standard Table component with Sort, Select, and Pagination.
 * 
 * @param {Array<{header: string, accessor: string, render: function, width: string, sortable: boolean}>} columns
 * @param {Array<object>} data
 * @param {function} onRowClick
 * @param {boolean} selectable - Enable row selection
 * @param {boolean} multiSelect - Enable multiple row selection (default: true)
 * @param {function} onSelectionChange - Callback with selected items
 * @param {boolean} pagination - Enable pagination
 * @param {number} pageSize - Rows per page (default: 10)
 */
const Table = ({ 
    columns, 
    data = [], 
    onRowClick, 
    selectable = false, 
    multiSelect = true,
    onSelectionChange,
    pagination = false,
    pageSize = 10,
    className 
}) => {
    // --- State ---
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(new Set()); // Stores row indices based on original data

    // Reset pagination when data changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [data.length]); 

    // Notify selection changes
    useEffect(() => {
        if (onSelectionChange) {
            const selectedItems = data.filter((_, idx) => selectedIds.has(idx));
            onSelectionChange(selectedItems);
        }
    }, [selectedIds, data, onSelectionChange]);

    // --- Logic ---

    // 0. Pre-process: attach original index to ensure stable selection mapping
    const processedData = useMemo(() => {
        return data.map((item, index) => ({ ...item, _originalIndex: index }));
    }, [data]);

    // 1. Sorting
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return processedData;

        return [...processedData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedData, sortConfig]);

    // 2. Pagination
    const pageCount = pagination ? Math.ceil(sortedData.length / pageSize) : 1;
    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pagination, pageSize]);

    // --- Handlers ---

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleSelection = (originalIndex) => {
        const newSet = new Set(selectedIds);
        if (multiSelect) {
            if (newSet.has(originalIndex)) {
                newSet.delete(originalIndex);
            } else {
                newSet.add(originalIndex);
            }
        } else {
            // Single select: clear others
            newSet.clear();
            newSet.has(originalIndex) ? newSet.delete(originalIndex) : newSet.add(originalIndex);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAllPage = (checked) => {
        const newSet = new Set(multiSelect ? selectedIds : []);
        if (checked) {
            paginatedData.forEach(row => newSet.add(row._originalIndex));
        } else {
            paginatedData.forEach(row => newSet.delete(row._originalIndex));
        }
        setSelectedIds(newSet);
    };
    
    // Check if all CURRENT PAGE rows are selected
    const isAllPageSelected = paginatedData.length > 0 && paginatedData.every(row => selectedIds.has(row._originalIndex));

    return (
        <div className={cn("w-full flex flex-col gap-2", className)}>
            <div className="w-full overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {/* Checkbox Header */}
                                {selectable && (
                                    <th className="px-6 py-3 w-4">
                                        {multiSelect && (
                                            <Checkbox 
                                                checked={isAllPageSelected}
                                                onChange={(c) => toggleSelectAllPage(c)}
                                            />
                                        )}
                                    </th>
                                )}

                                {columns.map((col, idx) => (
                                    <th 
                                        key={idx} 
                                        className={cn(
                                            "px-6 py-3 font-semibold tracking-wider whitespace-nowrap select-none",
                                            col.sortable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                        )}
                                        style={col.width ? { width: col.width } : {}}
                                        onClick={() => col.sortable && handleSort(col.accessor)}
                                    >
                                        <div className="flex items-center gap-1 group">
                                            {col.header}
                                            {col.sortable && (
                                                <span className="text-gray-400">
                                                    {sortConfig.key === col.accessor ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                    ) : (
                                                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100">
                            {paginatedData && paginatedData.length > 0 ? (
                                paginatedData.map((row) => (
                                    <tr 
                                        key={row._originalIndex} 
                                        onClick={() => onRowClick && onRowClick(row)}
                                        className={cn(
                                            "transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50",
                                            onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50",
                                            selectedIds.has(row._originalIndex) && "bg-blue-50 dark:bg-blue-900/20"
                                        )}
                                    >
                                        {/* Checkbox Cell */}
                                        {selectable && (
                                            <td className="px-6 py-4">
                                                <Checkbox 
                                                    checked={selectedIds.has(row._originalIndex)}
                                                    onChange={() => toggleSelection(row._originalIndex)}
                                                    onClick={(e) => e.stopPropagation()} 
                                                />
                                            </td>
                                        )}

                                        {columns.map((col, cIdx) => (
                                            <td key={cIdx} className="px-6 py-4 whitespace-nowrap">
                                                {col.render ? col.render(row) : row[col.accessor]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {pagination && pageCount > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page {currentPage} of {pageCount} <span className="mx-2 text-gray-300">|</span> Total {data.length} items
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage === pageCount}
                            onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Table;
