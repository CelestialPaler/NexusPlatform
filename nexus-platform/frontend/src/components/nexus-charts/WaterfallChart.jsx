import React from 'react';
import HeatMap from './HeatMap';

/**
 * RF Waterfall Chart (Spectrogram).
 * Specialized Heatmap for visualizing Frequency Domain over Time.
 * 
 * - Y Axis: Time (Flows downwards, i.e., T0 at top, recent at bottom OR inverted based on preference).
 *   Actually, standard waterfalls often have T=0 (Current) at Top. Or bottom. 
 *   The user requested: "X axis is channels, Y axis is time... coordinate axis downwards... data expands downwards".
 *   This implies y-axis should be reversed (0 at top).
 * 
 * @param {Array<Array<number>>} data - Matrix of power levels (dBm) [time_step][channel_index]
 * @param {Array<string|number>} channels - List of channels for X axis (e.g. [36, 40, ...])
 * @param {Array<string>} timestamps - Labels for Y axis
 */
const WaterfallChart = ({ data, channels, timestamps, title = "RF Spectrum Waterfall", height = "500px" }) => {
    return (
        <HeatMap 
            title={title}
            z={data}
            x={channels}
            y={timestamps}
            colorscale="Jet" // 'Jet' or 'Portland' is classic for spectrum analyzers
            reverseY={true}  // Time flows down
            height={height}
        />
    );
};

export default WaterfallChart;
