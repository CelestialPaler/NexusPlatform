import React from 'react';
import BaseChart from './BaseChart';

/**
 * Standard Line Chart for Time Series or Sequence Data.
 * 
 * @param {Array<{x: [], y: [], name: string, color: string}>} series
 * @param {string} title
 * @param {string} xLabel
 * @param {string} yLabel
 */
const LineChart = ({ series, title, xLabel, yLabel, height = "300px" }) => {
    const data = series.map(s => ({
        x: s.x,
        y: s.y,
        type: 'scatter', // Plotly uses 'scatter' for lines
        mode: 'lines',   // 'lines', 'markers', or 'lines+markers'
        name: s.name,
        line: { 
            color: s.color, 
            width: 2,
            shape: 'spline' // Smooth curves by default? Or 'linear' for accuracy
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

export default LineChart;
