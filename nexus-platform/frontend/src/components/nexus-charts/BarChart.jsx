import React from 'react';
import BaseChart from './BaseChart';

/**
 * Standard Bar Chart.
 * Supports vertical and horizontal orientation.
 * 
 * @param {Array<{x: [], y: [], name: string, color: string}>} series
 * @param {string} title
 * @param {string} xLabel
 * @param {string} yLabel
 * @param {string} height
 * @param {string} orientation - 'v' (vertical) or 'h' (horizontal)
 * @param {boolean} stacked - if true, bars are stacked instead of grouped
 */
const BarChart = ({ series, title, xLabel, yLabel, height = "300px", orientation = 'v', stacked = false }) => {
    const data = series.map(s => ({
        x: s.x,
        y: s.y,
        type: 'bar',
        name: s.name,
        orientation: orientation,
        marker: {
            color: s.color,
        }
    }));

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        xaxis: { title: xLabel },
        yaxis: { title: yLabel },
        showlegend: series.length > 1,
        barmode: stacked ? 'stack' : 'group'
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default BarChart;
