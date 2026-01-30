import React from 'react';
import BaseChart from './BaseChart';

/**
 * Pie / Donut Chart.
 * 
 * @param {Array<{labels: [], values: [], name: string}>} data - Array of datasets (usually just one for Pie)
 * @param {string} title
 * @param {string} height
 * @param {boolean} donut - If true, renders as a Donut chart
 */
const PieChart = ({ data, title, height = "300px", donut = false }) => {
    const plotData = data.map(d => ({
        type: 'pie',
        labels: d.labels,
        values: d.values,
        name: d.name,
        hole: donut ? 0.4 : 0,
        textinfo: 'label+percent',
        hoverinfo: 'label+value+percent',
        marker: {
            // Optional: Define custom colors via d.colors if needed
            colors: d.colors
        }
    }));

    const layout = {
        title: title ? { text: title, x: 0.5 } : undefined, // Center title for Pie
        showlegend: true
    };

    return <BaseChart data={plotData} layout={layout} height={height} />;
};

export default PieChart;
