# -*- coding: utf-8 -*-
"""
Deep Media Analyzer for Miracast (RTP/MPEG2-TS/H.264)
Author: Maxwell's Demon
"""
import struct
import pandas as pd
import numpy as np
from scapy.all import rdpcap, IP, UDP

FILE_WIRE = r"data\capture.pcap"

def parse_rtp(payload):
    """
    Parse RTP Header
    0                   1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |V=2|P|X|  CC   |M|     PT      |       Sequence Number         |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                           Timestamp                           |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |           Synchronization Source (SSRC) identifier            |
   +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
    """
    if len(payload) < 12:
        return None
    
    first_byte = payload[0]
    if (first_byte & 0xC0) != 0x80: # Version 2
        return None
        
    seq = struct.unpack('>H', payload[2:4])[0]
    ts = struct.unpack('>I', payload[4:8])[0]
    marker = (payload[1] & 0x80) >> 7
    payload_type = payload[1] & 0x7F
    
    # Header len usually 12 bytes (if CC=0)
    cc = first_byte & 0x0F
    header_len = 12 + (cc * 4)
    
    return {
        'Seq': seq,
        'RTP_TS': ts,
        'Marker': marker,
        'PT': payload_type,
        'Payload': payload[header_len:]
    }

def analyze_mpeg2_ts(rtp_payload, packet_idx):
    """
    Parse MPEG2-TS Inside RTP
    TS Packet = 188 Bytes
    Header: 4 bytes
    Sync Byte (0x47) | TEI | PUSI | Priority | PID (13) | SC (2) | AF (2) | CC (4)
    """
    # Miracast usually packs 7 TS packets in 1 RTP (1316 bytes)
    # But checking strictly 0x47 alignment
    
    ts_packets = []
    
    offset = 0
    while offset + 188 <= len(rtp_payload):
        chunk = rtp_payload[offset : offset + 188]
        if chunk[0] != 0x47:
            # Sync lost?
            offset += 1
            continue
            
        # Parse Header
        # Byte 1: 0 0 0 [0 0 0 0 0] -> Transport Error, Start Indicator, Priority, PID_High
        b1 = chunk[1]
        b2 = chunk[2]
        
        tei = (b1 & 0x80) >> 7
        pusi = (b1 & 0x40) >> 6 # Payload Unit Start Indicator (New PES/Frame start)
        pid = ((b1 & 0x1F) << 8) | b2
        
        # Adaptation Field Control (Byte 3 bits 4-5)
        b3 = chunk[3]
        adapt_field_ctrl = (b3 & 0x30) >> 4
        has_adapt = (adapt_field_ctrl & 0x02)
        has_payload = (adapt_field_ctrl & 0x01)
        
        payload_start_idx = 4
        
        # Adaptation Field Parsing (for PCR)
        pcr = None
        if has_adapt:
            adapt_len = chunk[4]
            if adapt_len > 0:
                flags = chunk[5]
                # PCR flag is bit 4 (0x10)
                if (flags & 0x10):
                    # PCR is 6 bytes (33 bits base + 6 bits reserved + 9 bits ext)
                    pcr_base_raw = struct.unpack('>I', chunk[6:10])[0] # 32 bits
                    pcr_ext_high = chunk[10]
                    # This is complex, simplifying Pcr extraction
                    pcr = pcr_base_raw # rough
                    
            payload_start_idx += (1 + adapt_len)

        # NAL Unit Hunting (Only if PUSI or just scan payload?)
        # Simplest: Scan payload for 00 00 00 01
        nal_type = None
        if has_payload and payload_start_idx < 188:
            ts_payload = chunk[payload_start_idx:]
            # Only checking start of payload if PUSI is set usually helps find PES headers
            # But NALs are inside PES.
            
            # Brute force NAL search in this chunk
            # 00 00 01 or 00 00 00 01
            hex_str = ts_payload.hex()
            idx = hex_str.find('00000001')
            if idx != -1:
                # Next byte is NAL header
                # idx is char index, byte index is /2
                byte_idx = idx // 2
                if byte_idx + 4 < len(ts_payload):
                    nal_header = ts_payload[byte_idx + 4]
                    # H.264: F(1) NRI(2) Type(5)
                    nal_val = nal_header & 0x1F
                    # Filter common audio/padding or PMT/PAT NALs if confusing
                    nal_type = nal_val
                    
            # Try 3-byte start code
            elif hex_str.find('000001') != -1:
                idx = hex_str.find('000001')
                byte_idx = idx // 2
                if byte_idx + 3 < len(ts_payload):
                    nal_header = ts_payload[byte_idx + 3]
                    nal_type = nal_header & 0x1F

        ts_packets.append({
            'PID': pid,
            'PUSI': pusi,
            'PCR': pcr,
            'NAL_Type': nal_type
        })
        
        offset += 188
        
    return ts_packets

def deep_analyze(fpath):
    print(f"Reading {fpath}...")
    packets = rdpcap(fpath)
    
    # Filter for the main UDP flow (known from previous step)
    # We'll just take the highest volume UDP flow
    flow_map = {}
    for i, pkt in enumerate(packets):
        if IP in pkt and UDP in pkt:
            key = f"{pkt[IP].src}:{pkt[UDP].sport}"
            if key not in flow_map: flow_map[key] = []
            flow_map[key].append(pkt)
            
    target_key = max(flow_map, key=lambda k: len(flow_map[k]))
    target_pkts = flow_map[target_key]
    print(f"Target Flow: {target_key}, Packets: {len(target_pkts)}")
    
    data = []
    
    for i, pkt in enumerate(target_pkts):
        try:
            udp_payload = bytes(pkt[UDP].payload)
            rtp = parse_rtp(udp_payload)
            if not rtp: continue
            
            ts_info = analyze_mpeg2_ts(rtp['Payload'], i)
            
            # Aggregate NAL types found in this RTP packet
            nal_types = [x['NAL_Type'] for x in ts_info if x['NAL_Type'] is not None]
            has_idr = 5 in nal_types
            has_sps = 7 in nal_types
            has_pps = 8 in nal_types
            
            # Video PID detection (heuristic: PID with NALs)
            video_pids = [x['PID'] for x in ts_info if x['NAL_Type'] is not None]
            
            data.append({
                'Time': float(pkt.time),
                'Seq': rtp['Seq'],
                'RTP_TS': rtp['RTP_TS'],
                'Marker': rtp['Marker'],
                'Size': len(udp_payload),
                'NALs': nal_types,
                'IsIDR': has_idr,
                'IsSPS': has_sps,
                'VideoPIDs': video_pids
            })
        except Exception as e:
            continue
            
    df = pd.DataFrame(data)
    df = df.sort_values('Time')
    
    # --- Analysis ---
    print("\n--- Deep Video Stream Analysis ---")
    
    # 1. RTP Timestamp Delta (Frame Duration)
    # If RTP TS changes, it's a new frame (usually). 
    # For 90kHz clock, 30fps = 3000 delta, 60fps = 1500 delta.
    df['TS_Diff'] = df['RTP_TS'].diff()
    
    # Packets with TS_Diff > 0 are likely start of new frames (or parts of them depending on packetization)
    frame_starts = df[df['TS_Diff'] > 0]
    print(f"Detected {len(frame_starts)} Video Frames (based on RTP TS changes).")
    
    # Calculate Frame Intervals (FPS stability)
    frame_starts['Time_Diff'] = frame_starts['Time'].diff()
    avg_interval = frame_starts['Time_Diff'].mean()
    fps = 1.0 / avg_interval if avg_interval > 0 else 0
    print(f"Estimated FPS: {fps:.2f}")
    
    # Detect Jitter / Stalls in Frame Arrival
    # Stall = Receiver waits too long for next frame
    stalls = frame_starts[frame_starts['Time_Diff'] > 0.1] # >100ms gap
    if not stalls.empty:
        print(f"\n[!] Frame Arrival Stalls (>100ms): {len(stalls)}")
        print(stalls[['Time', 'Time_Diff', 'Seq', 'RTP_TS']].head(10).to_string())
    else:
        print("Frame Arrival Timing looks stable (no gaps > 100ms).")
        
    # 2. I-Frame Interval (GOP)
    idr_frames = df[df['IsIDR']]
    print(f"\nDetected {len(idr_frames)} IDR Frames (Keyframes).")
    if not idr_frames.empty:
        idr_frames['Time_Diff'] = idr_frames['Time'].diff()
        print("IDR Interval stats (sec):")
        print(idr_frames['Time_Diff'].describe())
        
        # Check if last IDR is too far from end
        last_idr_time = idr_frames.iloc[-1]['Time']
        end_time = df.iloc[-1]['Time']
        print(f"Time since last IDR: {end_time - last_idr_time:.2f}s")
    else:
        print("WARNING: No IDR Frames (NAL Type 5) found! Stream implies non-refreshing decoding.")

    # 3. Last Seconds Analysis
    print("\n--- Last 2 Seconds Activity ---")
    end_t = df['Time'].max()
    tail = df[df['Time'] > (end_t - 2.0)]
    
    # Check sequences
    first_seq = tail['Seq'].iloc[0]
    total_pkts = len(tail)
    print(f"Packets in last 2s: {total_pkts}")
    
    # NALs in last 2s
    recent_nals = []
    for x in tail['NALs']:
        recent_nals.extend(x)
    print(f"NAL Units in last 2s: {recent_nals}")
    
    # Check if RTP TS is static?
    unique_ts_tail = tail['RTP_TS'].unique()
    print(f"Unique RTP Timestamps in last 2s: {len(unique_ts_tail)} (Should be ~60 for 30fps)")

    if len(unique_ts_tail) < 5:
        print("CRITICAL: RTP Timestamp stuck! Encoder stopped producing new frames.")

deep_analyze(FILE_WIRE)
