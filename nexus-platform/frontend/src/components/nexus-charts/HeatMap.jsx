import React from 'react';
import BaseChart from './BaseChart';

/**
 * Heatmap for Matrix Visualization.
 * 
 * @param {Array<Array<number>>} z - Matrix data [row][col] (Standard Plotly prop)
 * @param {Array<string>} x - X Axis labels
 * @param {Array<string>} y - Y Axis labels
 * @param {string} title
 * @param {string} colorscale
 * @param {boolean} reverseY - If true, 0 is at the top (useful for matrix/waterfall)
 */
const HeatMap = ({ z, x, y, title, colorscale = 'Viridis', height = "400px", reverseY = false }) => {
    const data = [{
        z: z,
        x: x,
        y: y,
        type: 'heatmap',
        colorscale: colorscale,
        showscale: true
    }];

    const layout = {
        title: title ? { text: title, x: 0.05 } : undefined,
        yaxis: {
            autorange: reverseY ? 'reversed' : true
        }
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default HeatMap;
