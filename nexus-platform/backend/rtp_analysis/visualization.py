import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

def create_interactive_sequence_plot(rtp_results):
    if not rtp_results or not rtp_results.get('frame_stats'):
        return None, None

    frames = rtp_results['frame_stats']['raw_frames_list']
    data = []
    start_time = frames[0]['end_time']
    
    for i, f in enumerate(frames):
        rel_time = f['end_time'] - start_time
        rtp_diff = 0
        if i > 0:
            rtp_diff = f['rtp_ts'] - frames[i-1]['rtp_ts']
            
        color = 'blue'
        symbol = 'circle'
        size = 8
        
        if f['type'] == 'I':
            color = 'red'
            symbol = 'star'
            size = 15
        elif rtp_diff > 4000:
            color = 'orange'
            symbol = 'triangle-up'
            size = 12
            
        data.append({
            'Frame Index': i,
            'Time (s)': rel_time,
            'Size (KB)': f['size'] / 1024,
            'Type': f['type'],
            'Packets': f['packets'],
            'RTP TS': f['rtp_ts'],
            'RTP Diff': rtp_diff,
            'NAL Units': str(f['nal_types']),
            'Color': color,
            'Symbol': symbol,
            'MarkerSize': size
        })
    
    df = pd.DataFrame(data)
    
    # Plotly Chart
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, vertical_spacing=0.1,
                        subplot_titles=("Frame Sizes & Types", "RTP Timestamp Differences"),
                        row_heights=[0.7, 0.3])

    fig.add_trace(go.Scatter(x=df['Time (s)'], y=df['Size (KB)'], mode='lines',
                                line=dict(color='gray', width=1, dash='dot'), name='Trend', hoverinfo='skip'), row=1, col=1)

    fig.add_trace(go.Scatter(x=df['Time (s)'], y=df['Size (KB)'], mode='markers',
                                marker=dict(color=df['Color'], symbol=df['Symbol'], size=df['MarkerSize'], line=dict(width=1, color='DarkSlateGrey')),
                                text=df.apply(lambda row: f"Frame #{row['Frame Index']}<br>Type: {row['Type']}<br>Size: {row['Size (KB)']:.2f} KB<br>Packets: {row['Packets']}<br>NALs: {row['NAL Units']}", axis=1),
                                hoverinfo='text', name='Frames'), row=1, col=1)

    colors = ['green' if x < 3500 else 'red' for x in df['RTP Diff']]
    fig.add_trace(go.Bar(x=df['Time (s)'], y=df['RTP Diff'], marker_color=colors, text=df['RTP Diff'], name='RTP Diff'), row=2, col=1)

    fig.add_hline(y=3000, line_dash="dash", line_color="green", annotation_text="30 FPS", row=2, col=1)
    fig.add_hline(y=6000, line_dash="dash", line_color="red", annotation_text="Drop Threshold", row=2, col=1)

    fig.update_layout(height=800, hovermode="closest", template="plotly_white")
    
    return fig, df
