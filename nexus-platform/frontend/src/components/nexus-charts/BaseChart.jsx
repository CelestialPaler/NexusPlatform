import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '../../hooks/useTheme'; 

/**
 * Base Chart Component using Plotly.js
 * Encapsulates common styling (fonts, background, responsiveness)
 * 
 * @param {object} data - Plotly data array
 * @param {object} layout - Plotly layout object (will be merged with defaults)
 * @param {object} config - Plotly config object
 * @param {string} height - CSS height (default: "100%")
 */
const BaseChart = ({ data, layout, config, height = "100%", className }) => {
    // Detect Dark Mode via Context for reactivity
    const { isDarkMode } = useTheme();
    
    const defaultLayout = useMemo(() => ({
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)', // Transparent
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent
        font: {
            family: 'Inter, system-ui, sans-serif',
            color: isDarkMode ? '#e5e7eb' : '#374151'
        },
        margin: { t: 30, r: 20, l: 50, b: 40 },
        xaxis: {
            gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
            zerolinecolor: isDarkMode ? '#4b5563' : '#d1d5db',
        },
        yaxis: {
            gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
            zerolinecolor: isDarkMode ? '#4b5563' : '#d1d5db',
        },
        legend: {
            orientation: 'h',
            y: -0.2
        }
    }), [isDarkMode]);

    const mergedLayout = { ...defaultLayout, ...layout };

    const defaultConfig = {
        displayModeBar: false, // Clean look by default
        responsive: true,
        ...config
    };

    return (
        <div className={`w-full ${className}`} style={{ height }}>
            <Plot
                data={data}
                layout={mergedLayout}
                config={defaultConfig}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
            />
        </div>
    );
};

export default BaseChart;
