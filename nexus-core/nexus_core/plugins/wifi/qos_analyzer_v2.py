# -*- coding: utf-8 -*-
"""
QoS & Airtime Analysis Tool for 802.11
Author: Maxwell's Demon
Date: 2026-01-20
"""

import sys
import struct
import os
import pandas as pd
import numpy as np
from scapy.all import rdpcap, Dot11, Dot11QoS, RadioTap

# 配置常量
TARGET_MACS = {'06:1a:9d:11:88:da', '74:24:ca:5e:b6:54'}

def get_airtime(packet):
    """
    计算单个包的空口时长 (Airtime) - 简化版
    TODO: 考虑 Preamble/PLCP header 和 11n/ac/ax 的复杂 MCS
    目前仅使用 Radiotap Rate 字段 (Legacy Rate)
    """
    # 默认值
    default_rate = 6.0 # Mbps (Lowest for OFDM)
    rate_mbps = default_rate 
    
    if packet.haslayer(RadioTap):
        rt = packet[RadioTap]
        # Scapy 解析的 Radiotap Rate 单位通常是 500kbps (0.5 Mbps)
        # 例如 12 => 6 Mbps, 24 => 12 Mbps
        if hasattr(rt, 'Rate') and rt.Rate and rt.Rate > 0:
            rate_mbps = rt.Rate * 0.5
    
    # Airtime (us) = (Bytes * 8) / Rate (Mbps)
    # 1 Byte = 8 bits
    # Mbps = bits / us
    # bits / (bits/us) = us
    pkt_len = len(packet)
    airtime_us = (pkt_len * 8) / rate_mbps
    
    return airtime_us

def is_multicast_or_broadcast(mac_addr):
    """
    检查 MAC 地址是否为组播或广播
    广播: ff:ff:ff:ff:ff:ff
    组播: 第一个字节的最低位为 1 (例如 01:...)
    """
    if not mac_addr: 
        return False
    # 解析第一个字节
    try:
        first_byte = int(mac_addr.split(':')[0], 16)
        return (first_byte & 1) == 1
    except:
        return False

def parse_pcap_strict(pcap_path):
    print(f"正在解析: {os.path.basename(pcap_path)} ...")
    
    try:
        packets = rdpcap(pcap_path)
    except Exception as e:
        print(f"读取 PCAP 失败: {e}")
        return None, None

    print(f"[*] 加载了 {len(packets)} 个数据包，开始提取特征...")
    
    qos_events = []
    
    # 统计数据
    stats = {
        'total_frames': 0,
        'total_bytes': 0,
        'total_airtime': 0.0,
        'mcast_bcast_frames': 0,
        'mcast_bcast_bytes': 0,
        'mcast_bcast_airtime': 0.0
    }
    
    for i, pkt in enumerate(packets):
        if not pkt.haslayer(Dot11):
            continue
            
        stats['total_frames'] += 1
        stats['total_bytes'] += len(pkt)
        
        # 计算 Airtime
        airtime = get_airtime(pkt)
        stats['total_airtime'] += airtime
        
        # 提取 MAC 地址
        try:
            addr1 = pkt.addr1 # RA (Receiver)
            # addr2 = pkt.addr2 # TA (Transmitter) - 可能为 None
        except AttributeError:
            continue

        # 统计组播/广播
        if is_multicast_or_broadcast(addr1):
            stats['mcast_bcast_frames'] += 1
            stats['mcast_bcast_bytes'] += len(pkt)
            stats['mcast_bcast_airtime'] += airtime

        # ---------------------------------------------------------
        # QoS & BlockAck 解析逻辑 (仅关注特定 MAC 交互)
        # ---------------------------------------------------------
        
        # 过滤非目标设备的交互 (只分析单播流的 QoS 问题)
        # 如果是组播包，通常不需要分析 BlockAck 逻辑，所以在这里过滤
        # 但要注意，如果 TARGET_MACS 为空，则不过滤
        addr1 = pkt.addr1
        addr2 = pkt.addr2
        
        if TARGET_MACS:
            # 只要源或目的其一在目标列表中即可
            sender_match = addr2 in TARGET_MACS
            receiver_match = addr1 in TARGET_MACS
            if not (sender_match or receiver_match):
                continue

        timestamp = float(pkt.time)
        type_val = pkt.type
        subtype_val = pkt.subtype

        try:
            # 1. QoS Data (Type 2, Subtype 8)
            if type_val == 2 and subtype_val == 8:
                dot11 = pkt[Dot11]
                
                tid = 0
                if pkt.haslayer(Dot11QoS):
                    tid = pkt[Dot11QoS].TID # QoS Control Bits 0-3
                
                sc = dot11.SC
                seq_num = (sc >> 4) if sc is not None else -1
                
                fc = dot11.FCfield
                # Retry bit is bit 3 (0x08)
                # Scapy FCfield is an int usually
                retry = 1 if (int(fc) & 0x08) else 0
                
                qos_events.append({
                    'No': i + 1,
                    'Time': timestamp,
                    'Type': 'QoS-Data',
                    'TA': addr2,
                    'RA': addr1,
                    'TID': tid,
                    'SN': seq_num,
                    'SSN': -1,
                    'Retry': retry,
                    'RawBitmap': 0 # 占位
                })

            # 2. BlockAck (Type 1, Subtype 9)
            elif type_val == 1 and subtype_val == 9:
                payload = bytes(pkt[Dot11].payload)
                if len(payload) >= 12:
                    # 解析 BA Control (2), BA SSC (2), Bitmap (8)
                    ba_control, ba_ssc, bitmap = struct.unpack('<HHQ', payload[:12])
                    
                    # === 修复 TID 解析 Bug ===
                    # BA Control Bits 12-15 是 TID_INFO
                    tid = (ba_control >> 12) & 0x0F 
                    
                    ssn = (ba_ssc >> 4) & 0x0FFF
                    
                    qos_events.append({
                        'No': i + 1,
                        'Time': timestamp,
                        'Type': 'BlockAck',
                        'TA': addr2,
                        'RA': addr1,
                        'TID': tid,
                        'SN': -1,
                        'SSN': ssn,
                        'Retry': 0,
                        'RawBitmap': bitmap # Python 原生大整数
                    })

            # 3. BlockAckRequest (Type 1, Subtype 8)
            elif type_val == 1 and subtype_val == 8:
                payload = bytes(pkt[Dot11].payload)
                if len(payload) >= 4:
                    bar_control, bar_ssc = struct.unpack('<HH', payload[:4])
                    
                    # === 修复 TID 解析 Bug ===
                    tid = (bar_control >> 12) & 0x0F
                    
                    ssn = (bar_ssc >> 4) & 0x0FFF
                    
                    qos_events.append({
                        'No': i + 1,
                        'Time': timestamp,
                        'Type': 'BlockAckReq',
                        'TA': addr2,
                        'RA': addr1,
                        'TID': tid,
                        'SN': -1,
                        'SSN': ssn,
                        'Retry': 0,
                        'RawBitmap': 0
                    })
                    
        except Exception as e:
            # print(f"Error parsing packet {i+1}: {e}")
            pass

    # 生成 DataFrame
    if not qos_events:
        return pd.DataFrame(), stats
        
    df = pd.DataFrame(qos_events)
    # === 修复精度丢失 Bug ===
    # 强制将 RawBitmap 列转换为 object 类型，防止 pandas 自动推断为 float64 丢失精度
    df['RawBitmap'] = df['RawBitmap'].astype(object)
    
    return df, stats

def analyze_qos_consistency(df):
    """
    分析 BlockAck 的逻辑一致性 (1 -> 0 翻转)
    """
    if df.empty:
        return []
    
    issues = []
    
    # 按会话分组: (Sender, Receiver, TID)
    # BlockAck 是 Receiver 发给 Sender 的
    # 这里我们只关注 BlockAck 帧本身
    
    # 建立状态跟踪
    # Key: (TA, RA, TID) -> 这里 TA 是发送 BA 的人 (Receiver of Data)
    # Value: Dict { SequenceNumber: First_Ack_Frame_No }
    # 意思是：针对特定流，某个 SN 第一次被确认是在哪一帧
    
    acked_history = {} # (TA_of_BA, RA_of_BA, TID) -> { sn: frame_no }
    
    # 为了调试翻转，我们需要知道上一个 BA 的状态吗？
    # 逻辑：
    # 1. 遍历所有 BA 帧
    # 2. 如果某个 SN 在之前的 BA 中已经被 ACK (设置为1)
    # 3. 在当前的 BA 中，该 SN 依然在窗口内，却变成了 0
    # 4. 且这期间没有收到 BAR (虽然收到 BAR 也不应该导致已收到的包变未收到，除非是清理缓存，但通常已提交给上层)
    #    更严格来说：ACK 状态应该是单调递增的（一旦收到，就是收到了）
    
    # 过滤出 BA 帧
    ba_df = df[df['Type'] == 'BlockAck'].sort_values('No')
    
    for item in ba_df.itertuples():
        # itertuples 能够保留 object 类型的大整数精度
        src = item.TA # 发送 BA 的设备
        dst = item.RA # 接收 BA 的设备 (源数据发送者)
        tid = item.TID
        ssn = item.SSN
        bitmap = item.RawBitmap # Int
        frame_no = item.No
        timestamp = item.Time
        
        key = (src, dst, tid)
        if key not in acked_history:
            acked_history[key] = {}
            
        history = acked_history[key]
        
        # 遍历 Bitmap 的 64 位
        for offset in range(64):
            # 计算对应的 SN
            curr_sn = (ssn + offset) % 4096
            
            # 检查当前位是否为 1
            is_acked_now = (bitmap >> offset) & 1
            
            if is_acked_now:
                # 记录首次 ACK
                if curr_sn not in history:
                    history[curr_sn] = frame_no
            else:
                # 当前显示为 0 (未收到/未确认)
                # 检查历史上是否已经确认过
                if curr_sn in history:
                    prev_ack_frame = history[curr_sn]
                    
                    # 发现翻转! 之前说是1，现在说是0
                    # 注意：如果 SN 已经滑出窗口很久了，可能会被清理，但 SSN 是窗口起始
                    # 这里 (ssn + offset) 就是当前的窗口，所以如果是 0，意味着确实不在当前窗口或未收到
                    
                    issues.append({
                        'No': frame_no,
                        'Time': timestamp,
                        'TID': tid,
                        'Issue': f"SN={curr_sn} FLIPPED (1->0)",
                        'Prev_ACK_Frame': prev_ack_frame,
                        'SSN': ssn,
                        'Offset': offset
                    })
                    
                    # 避免对同一个 SN 重复报错 (除非它反复横跳)
                    # 我们可以选择移除历史记录，或者保留
                    # 保留的话，后续每一帧都会报错。为了减少噪音，这里暂不移除，
                    # 但分析报告时可以去重
    
    return issues

def main():
    target_dir = r"data\1.20-屏蔽房"
    target_file = "c3-4s.pcapng" # 优先分析这个
    
    full_path = os.path.join(target_dir, target_file)
    if not os.path.exists(full_path):
        print(f"文件不存在: {full_path}")
        return

    # 1. 解析
    df, stats = parse_pcap_strict(full_path)
    
    if df is None or df.empty:
        print("未提取到有效数据。")
        return
        
    print("\n" + "="*50)
    print(f"📊 通用统计报告: {target_file}")
    print("="*50)
    print(f"总数据包数: {stats['total_frames']}")
    print(f"总字节数:   {stats['total_bytes'] / 1024 / 1024:.2f} MB")
    print("-" * 30)
    
    # 计算组播/广播占比
    frame_ratio = stats['mcast_bcast_frames'] / stats['total_frames'] if stats['total_frames'] > 0 else 0
    byte_ratio = stats['mcast_bcast_bytes'] / stats['total_bytes'] if stats['total_bytes'] > 0 else 0
    airtime_ratio = stats['mcast_bcast_airtime'] / stats['total_airtime'] if stats['total_airtime'] > 0 else 0
    
    print(f"📢 组播/广播 (Mcast/Bcast) 占比:")
    print(f"   - 帧数占比: {frame_ratio * 100:.2f}% ({stats['mcast_bcast_frames']} frames)")
    print(f"   - 流量占比: {byte_ratio * 100:.2f}% (按字节计算)")
    print(f"   - 空时占比: {airtime_ratio * 100:.2f}% (按物理速率估算)")
    print("   *注: 根据 Radiotap 物理速率估算其实际空口占用时常。")
    print("="*50)

    # 2. QoS 分析
    print("\n🔍 正在分析 QoS / BlockAck 一致性...")
    
    # 打印一下出现的 TID，确认是否还有 "TID 1"
    unique_tids = df[df['TID'] != -1]['TID'].unique()
    print(f"检测到的 TID 集合: {sorted(unique_tids)}")
    
    anomalies = analyze_qos_consistency(df)
    
    print(f"QoS 异常条目 (1->0 翻转): {len(anomalies)}")
    
    if len(anomalies) > 0:
        # 保存异常
        out_csv = os.path.join(target_dir, f"{target_file}_anomalies_fixed_v2.csv")
        anomaly_df = pd.DataFrame(anomalies)
        anomaly_df['TimeStr'] = anomaly_df['Time'].apply(lambda x: f"{x:.3f}") # 简单格式化
        anomaly_df.to_csv(out_csv, index=False)
        print(f"[√] 异常列表已保存至: {out_csv}")
        
        # 打印前 5 个
        print("\nTop 5 Anomalies:")
        print(anomaly_df.head().to_string(index=False))
    else:
        print("🎉 未发现 BlockAck 状态翻转异常。")

if __name__ == "__main__":
    main()
