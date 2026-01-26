import React from 'react';

const TimeInput24 = ({ value, onChange, disabled, withSeconds = false, className = "" }) => {
    const parts = (value || (withSeconds ? "00:00:00" : "00:00")).split(':');
    const h = parts[0] || "00";
    const m = parts[1] || "00";
    const s = parts[2] || "00";

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const update = (type, val) => {
        if (withSeconds) {
            onChange(`${type === 'h' ? val : h}:${type === 'm' ? val : m}:${type === 's' ? val : s}`);
        } else {
            onChange(`${type === 'h' ? val : h}:${type === 'm' ? val : m}`);
        }
    };

    const selectClass = `p-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 appearance-none text-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`;

    return (
        <div className="flex items-center gap-0.5">
            <select value={h} onChange={e => update('h', e.target.value)} disabled={disabled} className={selectClass}>
                {hours.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <span className="text-gray-400">:</span>
            <select value={m} onChange={e => update('m', e.target.value)} disabled={disabled} className={selectClass}>
                {minutes.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            {withSeconds && (
                <>
                    <span className="text-gray-400">:</span>
                    <select value={s} onChange={e => update('s', e.target.value)} disabled={disabled} className={selectClass}>
                        {minutes.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                </>
            )}
        </div>
    );
};

export default TimeInput24;
