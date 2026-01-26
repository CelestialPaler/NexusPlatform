# -*- coding: utf-8 -*-
"""
Miracast Freeze Analyzer (Air vs Wire)
"""
import sys
import os
import struct
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scapy.all import rdpcap, Packet, IP, UDP, Dot11, Dot11QoS, RadioTap

# --- Configuration ---
FILE_AIR = r"data\unicast-from-set-up-to-frozen-1s.pcapng"
FILE_WIRE = r"data\capture.pcap"
BIN_SIZE = 0.5 # Seconds for aggregation

def parse_rtp_sequence(payload):
    # Minimal RTP header parse
    # Byte 0: V(2) P(1) X(1) CC(4)
    # Byte 1: M(1) PT(7)
    # Byte 2-3: Sequence Number
    if len(payload) < 12:
        return None
    
    # Check Version=2 (0x80 usually)
    b0 = payload[0]
    if (b0 & 0xC0) != 0x80:
        return None
        
    seq = struct.unpack('>H', payload[2:4])[0]
    return seq

def analyze_wire_capture(fpath):
    print(f"\n[Wire] Analyzing {os.path.basename(fpath)}...")
    packets = rdpcap(fpath)
    
    # Auto-detect heavy UDP flow
    flow_stats = {}
    
    events = []
    
    print(f"  > Loaded {len(packets)} packets. Scanning for RTP...")
    
    for pkt in packets:
        if IP in pkt and UDP in pkt:
            src = pkt[IP].src
            dst = pkt[IP].dst
            sport = pkt[UDP].sport
            dport = pkt[UDP].dport
            # payload = bytes(pkt[UDP].payload)
            # scapy payload is complex, try raw bytes
            try:
                payload = bytes(pkt[UDP].payload)
            except:
                continue

            flow_id = f"{src}:{sport}->{dst}:{dport}"
            
            if flow_id not in flow_stats:
                flow_stats[flow_id] = 0
            flow_stats[flow_id] += len(payload)
            
            # Extract RTP
            seq = parse_rtp_sequence(payload)
            
            events.append({
                'Time': float(pkt.time),
                'Flow': flow_id,
                'Len': len(payload),
                'Seq': seq # Might be None
            })
            
    if not events:
        print("  > No UDP/IP packets found.")
        return None

    # Pick top flow
    target_flow = max(flow_stats, key=flow_stats.get)
    print(f"  > Target RTP Flow identified: {target_flow} ({flow_stats[target_flow]/1024/1024:.2f} MB)")
    
    df = pd.DataFrame([e for e in events if e['Flow'] == target_flow])
    df = df.sort_values('Time')
    
    # Normalize Time
    df['RelTime'] = df['Time'] - df['Time'].iloc[0]
    
    # Calculate Metrics
    # 1. Throughput (Mbps)
    df['TimeBin'] = (df['RelTime'] // BIN_SIZE) * BIN_SIZE
    throughput = df.groupby('TimeBin')['Len'].sum() * 8 / 1024 / 1024 / BIN_SIZE # Mbps
    
    # 2. Loss Analysis (Seq Gaps)
    # Filter only packets with parsed Seq
    df_seq = df[df['Seq'].notnull()].copy()
    if not df_seq.empty:
        # Handle wrap-around? RTP is 16-bit.
        # Simple diff
        df_seq['SeqDiff'] = df_seq['Seq'].diff()
        # Normal diff is 1. wrapping 65535->0 diff is -65535.
        # Lost packet: Diff > 1 (and not huge negative)
        
        # Correct wrap around logic:
        # If diff < -60000, it's a wrap, treat as (65536 + curr - prev)
        # If diff > 1 and < 1000, it's a loss.
        # If diff is 0, duplicate.
        # If diff < 0 (small), out of order.
        
        loss_events = []
        for i in range(1, len(df_seq)):
            diff = df_seq.iloc[i]['Seq'] - df_seq.iloc[i-1]['Seq']
            ts = df_seq.iloc[i]['Time']
            
            if diff == 1:
                continue
            elif diff < -60000: # Wrap
                real_diff = diff + 65536
                if real_diff > 1:
                    loss_events.append({'Time': ts, 'Lost': real_diff - 1})
            elif diff > 1: # Loss
                loss_events.append({'Time': ts, 'Lost': diff - 1})
        
        print(f"  > Detected {sum(x['Lost'] for x in loss_events)} missing RTP frames.")
    else:
        loss_events = []
        print("  > No valid RTP headers found (maybe encrypted or TS over TCP?)")

    return {
        'throughput': throughput,
        'loss_events': loss_events,
        'df': df
    }

def analyze_air_capture(fpath):
    print(f"\n[Air] Analyzing {os.path.basename(fpath)}...")
    packets = rdpcap(fpath)
    
    # Detect Main MAC Pair (QoS Data)
    mac_vol = {}
    events = []
    
    print(f"  > Loaded {len(packets)} packets. Parsing Wi-Fi stats...")
    
    for pkt in packets:
        if not pkt.haslayer(Dot11):
            continue
            
        try:
            ts = float(pkt.time)
            
            # Stats for RSSI / Retry
            rssi = 0
            rate = 0
            if pkt.haslayer(RadioTap):
                rt = pkt[RadioTap]
                if hasattr(rt, 'dBm_AntSignal'):
                    rssi = rt.dBm_AntSignal
                if hasattr(rt, 'Rate') and rt.Rate:
                    rate = rt.Rate * 0.5 # Mbps
            
            # Dot11
            d11 = pkt[Dot11]
            type_val = d11.type
            subtype_val = d11.subtype
            
            # QoS Data
            if type_val == 2 and subtype_val == 8:
                addr1 = d11.addr1 # RA
                addr2 = d11.addr2 # TA
                
                # Volume count
                pair = f"{addr2}->{addr1}"
                if pair not in mac_vol: mac_vol[pair] = 0
                mac_vol[pair] += len(pkt)
                
                # Retry
                fc = d11.FCfield
                # Retry is bit 3 (0x800 if big endian? No, scapy handles FCfield as int?)
                # Actually Scapy FCfield is an object.
                # Use int(d11.FCfield) & 0x08
                is_retry = 1 if (int(fc) & 0x08) else 0
                
                events.append({
                    'Time': ts,
                    'Pair': pair,
                    'RSSI': rssi,
                    'Rate': rate,
                    'Retry': is_retry,
                    'Len': len(pkt)
                })
        except:
            continue
            
    if not events:
        print("  > No 802.11 frames found.")
        return None
        
    # Top Pair
    target_pair = max(mac_vol, key=mac_vol.get)
    print(f"  > Target Wi-Fi Link: {target_pair} ({mac_vol[target_pair]/1024/1024:.2f} MB)")
    
    df = pd.DataFrame([e for e in events if e['Pair'] == target_pair])
    df = df.sort_values('Time')
    
    df['RelTime'] = df['Time'] - df['Time'].iloc[0]
    
    # Aggregation
    df['TimeBin'] = (df['RelTime'] // BIN_SIZE) * BIN_SIZE
    
    grouped = df.groupby('TimeBin')
    
    metrics = pd.DataFrame({
        'RetryRate': grouped['Retry'].mean() * 100, # %
        'AvgRSSI': grouped['RSSI'].mean(),
        'Throughput': grouped['Len'].sum() * 8 / 1024 / 1024 / BIN_SIZE, # Mbps
        'Count': grouped['Len'].count()
    })
    
    return metrics

def generate_report():
    # Run analyses
    # Adjust paths if needed
    base_dir = os.getcwd()
    f_air = os.path.join(base_dir, FILE_AIR)
    f_wire = os.path.join(base_dir, FILE_WIRE)
    
    if not os.path.exists(f_air): f_air = FILE_AIR
    if not os.path.exists(f_wire): f_wire = FILE_WIRE
    
    wire_res = analyze_wire_capture(f_wire)
    air_res = analyze_air_capture(f_air)
    
    print("\n" + "="*60)
    print("📊 COMPREHENSIVE DIAGNOSIS (Relative Time)")
    print("="*60)
    
    # 1. Wire Analysis (The Symptom)
    if wire_res:
        tp = wire_res['throughput']
        print("\n[Video Stream Health]")
        print(f"  > Average Bitrate: {tp.mean():.2f} Mbps")
        print(f"  > Peak Bitrate:    {tp.max():.2f} Mbps")
        print(f"  > RTP Packet Loss: {sum(x['Lost'] for x in wire_res['loss_events'])} frames detected.")
        
        # Detect "Freeze" (Throughput drops to near zero at the end?)
        # Look at last 5 bins
        print("  > Throughput Samples (Last 5 sec):")
        print(tp.tail(10).to_string())
        
        # Check for sudden drops
        drops = tp[tp < 0.5] # Less than 500kbps usually means freeze for video
        if not drops.empty:
            print(f"  ⚠️ FREEZE DETECTED! Stream dropped below 0.5Mbps at relative time:")
            print(drops.index.tolist())
    
    # 2. Air Analysis (The Cause?)
    if air_res is not None:
        print("\n[Wi-Fi Health]")
        print(f"  > Average RSSI:       {air_res['AvgRSSI'].mean():.1f} dBm")
        print(f"  > Average Retry Rate: {air_res['RetryRate'].mean():.2f}%")
        
        # Correlations
        # High Retry bursts?
        bursts = air_res[air_res['RetryRate'] > 15] # >15% is bad
        if not bursts.empty:
            print(f"  ⚠️ UNSTABLE LINK! High Retry Rate (>15%) detected at relative time:")
            print(bursts['RetryRate'].to_string())
            
        # Low RSSI?
        weak = air_res[air_res['AvgRSSI'] < -70]
        if not weak.empty:
            print(f"  ⚠️ WEAK SIGNAL! RSSI < -70dBm detected.")

    print("\n[Conclusion Hypothesis]")
    if wire_res and air_res is not None:
        # Check if Retry Burst aligns with Throughput Drop
        print("Compare the Relative Timestamps above:")
        print("1. If 'High Retry Rate' happens slightly before 'Freeze Detected', Wi-Fi Interference is the cause.")
        print("2. If 'Freeze Detected' happens but Wi-Fi is clean (No high retry), the Source (Encoder) stalled.")
        
        if not wire_res['loss_events'] and tp.min() > 1.0:
             print("Note: I don't see a full <1Mbps freeze in the provided Wire slice.")
             
    print("="*60)

if __name__ == "__main__":
    try:
        generate_report()
    except Exception as e:
        print(f"Fatal Error: {e}")
        import traceback
        traceback.print_exc()
