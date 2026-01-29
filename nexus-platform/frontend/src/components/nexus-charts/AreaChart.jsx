import React from 'react';
import BaseChart from './BaseChart';

/**
 * Area Chart (Filled Line Chart).
 * Useful for visualizing cumulative magnitude or bandwidth over time.
 * 
 * @param {Array<{x: [], y: [], name: string, color: string}>} series
 * @param {string} title
 * @param {string} xLabel
 * @param {string} yLabel
 * @param {string} height
 * @param {boolean} stack - Stack areas on top of each other
 */
const AreaChart = ({ series, title, xLabel, yLabel, height = "300px", stack = false }) => {
    const data = series.map((s, i) => ({
        x: s.x,
        y: s.y,
        type: 'scatter',
        fill: stack && i > 0 ? 'tonexty' : 'tozeroy', // 'tozeroy' for first, 'tonexty' for subsequent if stacked
        mode: 'lines', // Area charts usually don't show markers
        name: s.name,
        stackgroup: stack ? 'one' : undefined, // Plotly handles stacking with stackgroup
        line: { 
            color: s.color, 
            width: 2,
            shape: 'spline' 
        }
    }));

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        xaxis: { title: xLabel },
        yaxis: { title: yLabel },
        showlegend: series.length > 1
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default AreaChart;
