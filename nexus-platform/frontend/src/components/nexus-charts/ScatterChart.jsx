import React from 'react';
import BaseChart from './BaseChart';

/**
 * Scatter Chart.
 * Useful for showing correlation or distribution of discrete points.
 * 
 * @param {Array<{x: [], y: [], name: string, color: string, size: number, symbol: string}>} series
 * @param {string} title
 * @param {string} xLabel
 * @param {string} yLabel
 * @param {string} height
 */
const ScatterChart = ({ series, title, xLabel, yLabel, height = "300px" }) => {
    const data = series.map(s => ({
        x: s.x,
        y: s.y,
        type: 'scatter',
        mode: 'markers',
        name: s.name,
        text: s.labels, // Optional hover text per point
        marker: { 
            color: s.color, 
            size: s.size || 8,
            symbol: s.symbol || 'circle', // 'circle', 'square', 'diamond', 'cross'
            opacity: 0.7
        }
    }));

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        xaxis: { title: xLabel },
        yaxis: { title: yLabel },
        showlegend: series.length > 1,
        hovermode: 'closest'
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default ScatterChart;
