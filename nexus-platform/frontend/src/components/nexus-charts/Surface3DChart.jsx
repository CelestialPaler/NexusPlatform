import React from 'react';
import BaseChart from './BaseChart';

/**
 * 3D Surface Chart.
 * Good for RSSI mapping over space, or time-frequency analysis.
 * 
 * @param {Array<Array<number>>} zData - 2D Matrix of Z values (height)
 * @param {Array<number>} xLabels - Optional X-axis coordinates
 * @param {Array<number>} yLabels - Optional Y-axis coordinates
 * @param {string} title
 * @param {string} height
 */
const Surface3DChart = ({ zData, title, xLabels, yLabels, height = "500px" }) => {
    const data = [{
        z: zData,
        x: xLabels,
        y: yLabels,
        type: 'surface',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                project: { z: true }
            }
        },
        colorscale: 'Viridis'
    }];

    const layout = {
        title: title ? { text: title } : undefined,
        autosize: true,
        margin: {
            l: 0, r: 0, b: 0, t: 30
        },
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' },
        }
    };

    return <BaseChart data={data} layout={layout} height={height} />;
};

export default Surface3DChart;
