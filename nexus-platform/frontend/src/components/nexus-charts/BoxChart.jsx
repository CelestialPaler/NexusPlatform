import React from 'react';
import BaseChart from './BaseChart';

/**
 * Box Plot for statistical distribution analysis (Ping Latency, Jitter, etc.)
 * 
 * @param {Array<{y: [], name: string, color: string}>} dataSeries
 */
const BoxChart = ({ dataSeries, title, yLabel, height = "300px" }) => {
    const data = dataSeries.map(s => ({
        y: s.y,
        type: 'box',
        name: s.name,
        marker: { color: s.color },
        boxpoints: 'outliers' // Only show outliers
    }));

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        yaxis: { title: yLabel, zeroline: false }
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default BoxChart;
