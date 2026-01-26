# -*- coding: utf-8 -*-
"""
Micro-Jitter & Stall Analyzer for Miracast
Focus: Inter-Arrival Times (IAT) and Instantaneous Throughput
"""
import struct
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scapy.all import rdpcap, IP, UDP

FILE_WIRE = r"data\capture.pcap"

def parse_rtp_basic(payload):
    if len(payload) < 12: return None
    if (payload[0] & 0xC0) != 0x80: return None
    
    seq = struct.unpack('>H', payload[2:4])[0]
    ts = struct.unpack('>I', payload[4:8])[0]
    marker = (payload[1] & 0x80) >> 7
    return seq, ts, marker

def analyze_jitter(fpath):
    print(f"Loading {fpath} for jitter analysis...")
    packets = rdpcap(fpath)
    
    # 1. Filter Flow
    print("Filtering flow...")
    flow_map = {}
    for pkt in packets:
        if IP in pkt and UDP in pkt:
            key = f"{pkt[IP].src}:{pkt[UDP].sport}"
            if key not in flow_map: flow_map[key] = []
            flow_map[key].append(pkt)
            
    if not flow_map:
        print("No UDP packets.")
        return
        
    target_key = max(flow_map, key=lambda k: len(flow_map[k]))
    target_pkts = flow_map[target_key]
    print(f"Target Flow: {target_key}")

    # 2. Extract Timing Data
    data = []
    
    # Use global start time to normalize
    start_time = float(target_pkts[0].time)
    
    for i, pkt in enumerate(target_pkts):
        try:
            arrival_time = float(pkt.time)
            payload = bytes(pkt[UDP].payload)
            res = parse_rtp_basic(payload)
            if not res: continue
            
            seq, rtp_ts, marker = res
            
            data.append({
                'Time': arrival_time,
                'RelTime': arrival_time - start_time,
                'Seq': seq,
                'RTP_TS': rtp_ts,
                'Marker': marker,
                'Size': len(payload)
            })
        except:
            continue
            
    df = pd.DataFrame(data)
    df = df.sort_values('Time')
    
    print(f"Analyzed {len(df)} packets.")
    
    # --- Analysis 1: Packet Inter-Arrival Time (IAT) ---
    # High Packet IAT = Network Blockage / Sender Stall
    df['Packet_IAT_ms'] = df['Time'].diff() * 1000 # ms
    
    # Statistics
    print("\n--- Packet Level Statistics ---")
    print(df['Packet_IAT_ms'].describe())
    
    # Detect Micro-Stalls (Packet Gaps > 20ms implies missed transmit opportunity usually, unless idle)
    # For Video, packets usually come in bursts (Frame). Gaps between bursts are normal.
    # Gaps WITHIN bursts are bad.
    
    # --- Analysis 2: Frame Level Timing ---
    # Group by RTP Timestamp to identify "Frames"
    # A single video frame is split into multiple packets sharing the same RTP TS
    # The last packet of a frame usually has Marker=1 (but not always reliably in TS streams)
    
    print("\n--- Frame Level Analysis (Grouping by RTP TS) ---")
    frames = []
    
    grouped = df.groupby('RTP_TS')
    for rtp_ts, group in grouped:
        group = group.sort_values('Seq')
        
        # Frame Arrival Time (First packet of frame)
        t_start = group['Time'].iloc[0]
        # Frame Completion Time (Last packet of frame)
        t_end = group['Time'].iloc[-1]
        
        # Size
        total_size = group['Size'].sum()
        packets_count = len(group)
        
        frames.append({
            'RTP_TS': rtp_ts,
            'T_Start': t_start,
            'T_End': t_end,
            'RelTime': t_end - start_time, # Using completion time as reference
            'Size': total_size,
            'Packets': packets_count
        })
        
    df_frames = pd.DataFrame(frames)
    df_frames = df_frames.sort_values('T_Start') # RTP TS might wrap, rely on arrival time
    
    # Frame Inter-Arrival Time (IAT)
    # Time from Frame N completion to Frame N+1 completion
    df_frames['Frame_IAT_ms'] = df_frames['T_End'].diff() * 1000
    
    # Instantaneous FPS
    df_frames['Inst_FPS'] = 1000.0 / df_frames['Frame_IAT_ms']
    
    print(df_frames[['RelTime', 'Size', 'Packets', 'Frame_IAT_ms', 'Inst_FPS']].tail(10).to_string())
    
    # Check for "Stutter" definition: Frame IAT > 200ms (5fps) or infinite
    stalls = df_frames[df_frames['Frame_IAT_ms'] > 100] # >100ms is noticeable stutter for 60fps
    
    if not stalls.empty:
        print(f"\n⚠️ STUTTER DETECTED! Found {len(stalls)} frames with interval > 100ms.")
        print("Top 10 Worst Stalls:")
        print(stalls[['RelTime', 'Frame_IAT_ms', 'Inst_FPS', 'Size']].sort_values('Frame_IAT_ms', ascending=False).head(10).to_string())
    else:
        print("\n✅ No Frame Stalls (>100ms) detected. Frame delivery is smooth.")

    # --- Analysis 3: Instantaneous Throughput (50ms buckets) ---
    print("\n--- Instantaneous Throughput (50ms windows) ---")
    df['TimeBin_50ms'] = (df['RelTime'] // 0.05) * 0.05
    tp_50ms = df.groupby('TimeBin_50ms')['Size'].sum() * 8 / 1024 / 1024 / 0.05 # Mbps
    
    # Look for "Silence" periods (Tp < 0.1 Mbps)
    silence = tp_50ms[tp_50ms < 0.1]
    
    if not silence.empty:
        print(f"⚠️ NETWORK SILENCE! Found {len(silence)} windows (50ms) with near-zero data.")
        print("Silence periods (Relative Time):")
        print(silence.index.tolist())
    else:
        print("✅ No 50ms silence periods found. Data is flowing continuously.")

analyze_jitter(FILE_WIRE)
