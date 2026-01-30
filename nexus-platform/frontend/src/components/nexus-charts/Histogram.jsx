import React from 'react';
import BaseChart from './BaseChart';

/**
 * Histogram.
 * Visualizes the distribution of a dataset.
 * 
 * @param {Array<{data: [], name: string, color: string}>} series
 * @param {string} title
 * @param {string} xLabel
 * @param {string} yLabel
 * @param {string} height
 * @param {string} orientation - 'v' (vertical) or 'h' (horizontal)
 */
const Histogram = ({ series, title, xLabel, yLabel, height = "300px", orientation = 'v' }) => {
    const data = series.map(s => ({
        // For vertical histogram (default), x is the data array. Ployly calculates bins.
        x: orientation === 'v' ? s.data : null,
        y: orientation === 'h' ? s.data : null,
        type: 'histogram',
        name: s.name,
        orientation: orientation,
        marker: {
            color: s.color,
        },
        opacity: 0.75 // Semi-transparent for overlapping histograms
    }));

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        xaxis: { title: xLabel },
        yaxis: { title: yLabel },
        showlegend: series.length > 1,
        barmode: 'overlay' // 'overlay' or 'stack'
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default Histogram;
