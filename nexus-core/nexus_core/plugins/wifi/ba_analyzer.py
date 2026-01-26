import sys
import struct
from scapy.all import rdpcap, Dot11, Dot11QoS
import pandas as pd
from datetime import datetime

# 设置中文显示
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

def parse_pcap(pcap_file, target_macs=None, target_tid=None):
    print(f"[*] Reading file: {pcap_file}")
    if target_tid is not None:
        print(f"[*] Target TID: {target_tid}")
    
    try:
        packets = rdpcap(pcap_file)
    except Exception as e:
        print(f"[!] Read failed: {e}")
        return

    print(f"[*] File read success, {len(packets)} packets total. Analyzing...")
    
    events = []
    
    for i, packet in enumerate(packets):
        try:
            timestamp = float(packet.time)
            
            if not packet.haslayer(Dot11):
                continue
            
            dot11 = packet[Dot11]
            try:
                type_val = dot11.type
                subtype_val = dot11.subtype
                addr1 = dot11.addr1 # RA
                addr2 = dot11.addr2 # TA
            except AttributeError:
                continue

            # 简单的 MAC 过滤
            if target_macs:
                # 检查 addr1 或 addr2 是否在目标列表中
                # 这里逻辑是：如果是双向，那么只要其中一个在，或者两个都在?
                # 用户给的是一对，我们希望这个包属于这对交互
                # 简单宽松过滤：只要包涉及其中任何一个MAC
                # 或者严格过滤：RA和TA都在列表中
                # 鉴于用户给的是一对: 74:24:ca:6e:61:07 <-> da:54:ee:0b:a8:50
                # 我们采用严格过滤：(addr1 in target and addr2 in target)
                # Modify: Loose filter to support single MAC input
                if not (addr1 in target_macs or addr2 in target_macs):
                    continue

            # ---------------------------------------------------------
            # 1. 分析 QoS Data 帧
            # Subtypes: 8 (1000) is QoS Data.
            # ---------------------------------------------------------
            if type_val == 2 and (subtype_val == 8):
                # 提取 QoS Control (TID)
                tid = -1
                if packet.haslayer(Dot11QoS):
                    tid = packet[Dot11QoS].TID
                
                # 提取 Sequence Number
                sc = dot11.SC
                if sc is not None:
                    seq_num = (sc >> 4)
                    frag_num = (sc & 0x0F)
                else:
                    seq_num = -1
                    frag_num = -1
                    
                fc = dot11.FCfield
                retry = 1 if (fc & 0x08) else 0 # Retry bit
                
                events.append({
                    'No.': i + 1,
                    'Time': timestamp,
                    'Type': 'QoS-Data',
                    'TA': addr2,
                    'RA': addr1,
                    'TID': tid,
                    'SN': seq_num,
                    'SSN': '',
                    'Retry': 'Retry' if retry else 'New',
                    'Details': f"SN={seq_num} TID={tid} {'(Retry)' if retry else ''}"
                })

            # ---------------------------------------------------------
            # 2. 分析 BlockAck 帧 (Type=1 Control, Subtype=9 BlockAck)
            # ---------------------------------------------------------
            elif type_val == 1 and subtype_val == 9:
                # BlockAck 帧结构 (Compressed BA):
                # MAC Header: FC(2)+Dur(2)+RA(6)+TA(6) = 16 bytes.
                # Body: BA Control(2) + BA Starting Seq Control(2) + BA Bitmap(8) = 12 bytes.
                
                # 尝试获取 Raw payload
                if packet.haslayer(Dot11):
                    # Control frames usually don't have extra layers in Scapy 
                    # but payload is the raw bytes after the header.
                    payload_bytes = bytes(packet[Dot11].payload)
                    
                    if len(payload_bytes) >= 12:
                        # 解析 BA Control (2 bytes), BA SSC (2 bytes), Bitmap (8 bytes)
                        ba_control, ba_ssc, bitmap = struct.unpack('<HHQ', payload_bytes[:12])
                        
                        # TID 在 BA Control 的 bits 2-5
                        tid = (ba_control >> 2) & 0x0F
                        
                        # SSN 在 BA SSC 的 bits 4-15
                        ssn = (ba_ssc >> 4) & 0x0FFF
                        
                        events.append({
                            'No.': i + 1,
                            'Time': timestamp,
                            'Type': 'BlockAck',
                            'TA': addr2, # BA Sender
                            'RA': addr1, # BA Receiver
                            'TID': tid,
                            'SN': '',
                            'SSN': ssn,
                            'Retry': '-',
                            'Details': f"SSN={ssn} Bitmap={format_bitmap(bitmap)}",
                            'RawBitmap': bitmap
                        })

        except Exception as e:
            # print(f"[!] Error parsing packet {i}: {e}")
            continue

    if not events:
        print("[!] No relevant QoS or BlockAck frames found.")
        return

    df = pd.DataFrame(events)
    
    # Adjust timestamps
    if not df.empty:
        start_time = df['Time'].iloc[0]
        df['RelTime'] = df['Time'] - start_time
        df['TimeStr'] = df['Time'].apply(lambda x: datetime.fromtimestamp(x).strftime('%H:%M:%S.%f')[:-3])
    
    print("\n" + "="*120)
    print(f"Analysis Report - File: {pcap_file}")
    print(f"Total Relevant Frames: {len(events)}")
    print("="*120)
    
    # Output columns
    cols = ['No.', 'TimeStr', 'RelTime', 'Type', 'TA', 'RA', 'TID', 'SN', 'SSN', 'Retry', 'Details']
    
    # Print full list
    print(df[cols].to_string(index=False))

    print("\n" + "="*120)
    print("Summary:")
    print(f"QoS Data Frames : {len(df[df['Type'] == 'QoS-Data'])}")
    print(f"BlockAck Frames : {len(df[df['Type'] == 'BlockAck'])}")
    
    retry_count = len(df[(df['Type'] == 'QoS-Data') & (df['Retry'] == 'Retry')])
    total_data = len(df[df['Type'] == 'QoS-Data'])
    if total_data > 0:
        print(f"Retry Rate: {retry_count}/{total_data} ({retry_count/total_data*100:.2f}%)")
    
    print("="*120)

    # -------------------------------------------------------------------------
    # Anomaly Analysis: Detect BlockAck State Consistency (Acked -> Not Acked)
    # -------------------------------------------------------------------------
    print("\n[!] Checking BlockAck consistency...")
    check_ba_consistency(events, target_tid=target_tid)

def format_bitmap(bitmap_int):
    bits = []
    for i in range(64):
        # Bit 0 corresponds to SSN, Bit 1 to SSN+1...
        # In 802.11 BA Bitmap, bit 0 is the LSB of the first byte.
        # struct.unpack('<Q') parses 8 bytes as little-endian unsigned long long.
        # So LSB of integer is indeed the first bit of the bitmap field.
        bit_val = (bitmap_int >> i) & 1
        
        # Add space every 8 bits for readability
        if i > 0 and i % 8 == 0:
            bits.append(' ')
        bits.append('1' if bit_val else '.')
    return "".join(bits)

def check_ba_consistency(events, target_tid=None):
    """
    追踪每个 (RA, TA, TID) 的已确认 SN，检查是否出现由 '1' (Acked) 变为 '0' (Not Acked) 的情况。
    """
    if target_tid is not None:
        print(f"\n[+] Analyzing consistency for TID={target_tid} only...")

    # 存储状态: {(RA, TA, TID): set(acked_sns)}
    session_acked_sns = {}
    
    issues_found = 0
    
    # Iterate through Events List
    for row in events:
        if row['Type'] == 'BlockAck':
            ra = row['RA']
            ta = row['TA']
            tid = row['TID']
            
            # Filter specifically by TID if requested
            if target_tid is not None and tid != target_tid:
                continue

            ssn = row['SSN']
            
            # Check if we have the raw bitmap
            if 'RawBitmap' not in row or row['RawBitmap'] is None:
                continue
                
            bitmap = row['RawBitmap'] # Integer type preserved
            
            key = (ra, ta, tid)
            if key not in session_acked_sns:
                session_acked_sns[key] = set()
            
            current_acked_set = session_acked_sns[key]
            
            # Detect anomalies in this window
            # Window covers [SSN, SSN+63] (taking into account 12-bit wrapping)
            for i in range(64):
                current_sn = (ssn + i) % 4096
                is_acked = (bitmap >> i) & 1
                
                if is_acked:
                    # Mark as ACKed
                    current_acked_set.add(current_sn)
                else:
                    # Current bit is 0 (Not ACKed or Not Received)
                    # Check if it was PREVIOUSLY ACKed
                    if current_sn in current_acked_set:
                        # Format TimeStr manually since it's not in the dict yet
                        time_str = datetime.fromtimestamp(row['Time']).strftime('%H:%M:%S.%f')[:-3]
                        
                        # Only print anomalies for TID=7 if it's Miracast, or make it clear.
                        # Since user specifically asked for TID distinction, let's print it clearly.
                        if tid == 1:
                            # Skip printing TID 1 anomalies to avoid noise if user is focused on TID 7
                            # Or just print everything but label it well. 
                            pass 

                        print(f"[!] Anomaly Detected (Frame #{row['No.']} Time:{time_str}):")
                        print(f"    Link: {ta} -> {ra} (TID={tid})")
                        print(f"    SSN={ssn}, Bitmap Offset={i} -> SN={current_sn}")
                        print(f"    State: Previously ACKed -> Now NAKed/0")
                        print(f"    Bitmap: {format_bitmap(bitmap)}")
                        issues_found += 1
                        
                        # Once detected, do we remove it? 
                        # Usually invalidation means the receiver forgot it. 
                        # So strictly speaking, it is no longer ACKed in the receiver's view.
                        # But for our detection, we just log it. 
                        # To avoid spamming, we could remove it from 'current_acked_set' 
                        # so we don't report it again for *this* gap unless it gets ACKed again.
                        current_acked_set.remove(current_sn)

    if issues_found == 0:
        print("[OK] No BlockAck anomalies found.")
    else:
        print(f"\n[X] Found {issues_found} BlockAck state anomalies.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python qos_ba_analyzer.py <pcap_file> [mac1] [mac2] ...")
    else:
        target_macs = set()
        target_tid = None
        
        for arg in sys.argv[2:]:
            if arg.isdigit() and int(arg) < 8:
                target_tid = int(arg)
            else:
                target_macs.add(arg)
                
        if not target_macs:
            target_macs = None
        else:
            print(f"[*] Set Filter MACs: {target_macs}")
            
        parse_pcap(sys.argv[1], target_macs, target_tid)
